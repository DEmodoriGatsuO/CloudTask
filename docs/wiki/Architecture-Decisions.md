---
layout: page
title: 設計上の判断と技術的背景
---

# 設計上の判断と技術的背景

CloudTask を構築する際に行った主要な設計上の判断とその理由をまとめます。

---

## Cloudflare エコシステムへの全面依存

**判断:** バックエンド・DB・キャッシュ・ストレージ・リアルタイム通信をすべて Cloudflare で統一する。

**理由:**
- ポートフォリオとして「Cloudflare Workers エコシステムを使いこなせる」ことを示したかった
- エッジ実行により低レイテンシを実現できる
- 無料プランで十分な機能が揃っている（D1, KV, Workers, Pages）

**トレードオフ:**
- Cloudflare 固有のAPIに強く依存するため、他のプラットフォームへの移植性が低い
- D1 は SQLite ベースのため、複雑なクエリやトランザクションに制限がある

---

## Hono を選択

**判断:** Express の代わりに Hono を API フレームワークとして採用する。

**理由:**
- Cloudflare Workers のエッジランタイムとの相性が最良
- TypeScript ファーストで型安全なルーティングが可能
- `zValidator` による Zod スキーマのインライン統合が便利
- ミドルウェアの構成が Express と類似しており学習コストが低い

---

## モノレポ構成（apps/ + packages/shared）

**判断:** API と Web を別パッケージとして管理しつつ、`packages/shared` で型・バリデーション・ユーティリティを共有する。

**理由:**
- フロントとバックで型定義を二重管理するリスクを避ける
- Zod スキーマをフロント（フォームバリデーション）とバック（APIバリデーション）で共通利用できる
- `generateId()` や `nowUnix()` などのユーティリティを一元管理できる

---

## TanStack Query によるサーバー状態管理

**判断:** Redux や Zustand ではなく TanStack Query を主要なデータフェッチ・キャッシュ管理に使用する。

**理由:**
- サーバー状態とクライアント状態を明確に分離できる
- キャッシュの無効化・再フェッチのロジックが宣言的に書ける
- Optimistic Updates の実装が容易（カンバンボードのDnDで活用）

**使い方:** ほぼすべてのAPIアクセスはカスタムフック（`hooks/use*.ts`）に集約している。

---

## Durable Objects による WebSocket 管理

**判断:** リアルタイム通知のサーバー側管理に Durable Objects を使用する。

**理由:**
- Cloudflare Workers はステートレスなため、接続の保持には Durable Objects が必要
- 各プロジェクトの接続グループを1つの DO インスタンスで管理できる

**制限:** 無料プランでは Durable Objects に制約があり、`new_sqlite_classes` マイグレーションを使用する必要があった（`new_classes` ではなく）。

---

## snake_case / camelCase 変換層

**判断:** D1 の列名は snake_case、TypeScript コードは camelCase を使用し、`toCamelCase()` / `toSnakeCase()` で変換する。

**理由:**
- DB の慣習（snake_case）と JavaScript の慣習（camelCase）を両立する
- ORM を使わずに D1 の SQL クエリを直接書く設計のため、変換層が必要になった

**実装場所:** `apps/api/src/db/queries.ts`

---

## JWT 認証（完全ステートレス）

**判断:** KV セッションストアを廃止し、JWT 署名・期限検証のみによる完全ステートレス認証を採用する。

**経緯:**
当初は JWT + KV セッションストアのハイブリッド構成を採用していた。
- ログイン時: KV に `sessions:{userId}:{jti}` を write（TTL = JWT有効期間）
- 全認証リクエスト時: KV を read してセッションの存在を確認
- ログアウト時: KV から delete してトークンを即時無効化

しかし Cloudflare 無料プランの KV write 上限（1,000回/日）に達するアラートが発生。
「全認証リクエストで KV read」「全リクエストでレート制限の KV read+write」が重なり、
デモ環境の通常利用でも上限を超える構造的な問題だった。

**現在の設計:**
- `middleware/auth.ts`: `verify(token, secret, 'HS256')` のみ。KV アクセスなし
- `routes/auth.ts`: ログイン・ログアウトで KV への書き込み・削除なし
- KV バインディング（SESSIONS / CACHE）は `wrangler.jsonc` に残しているが未使用

**トレードオフ:**
- ログアウトしてもサーバー側でトークンを即時無効化できない
- JWT が期限切れ（7日後）になるまで技術的には有効なまま
- フロントエンドはログアウト時にトークンを破棄するため、実利用上の問題はない
- ポートフォリオ用途では許容範囲と判断

**本番化する場合の復元手順:**
1. `auth.service.ts` の `createSession` / `deleteSession` を再有効化
2. `middleware/auth.ts` に KV セッション検索を復元
3. レート制限は Cloudflare WAF または Workers Rate Limiting API へ移行

**JWT_SECRET の管理:** `wrangler secret put JWT_SECRET` で Cloudflare Secrets に保存。`wrangler.jsonc` には含まれない。

---

## @dnd-kit による Drag & Drop

**判断:** react-beautiful-dnd ではなく @dnd-kit を採用する。

**理由:**
- React 18 以降（特に Concurrent Mode）に対応している
- react-beautiful-dnd はメンテナンスが停止気味で React 19 との相性に懸念があった
- アクセシビリティ対応が組み込まれている

**トレードオフ:** API が低レベルで、実装量が増える。ドラッグ中のプレビュー表示（DragOverlay）の実装が複雑になった。
