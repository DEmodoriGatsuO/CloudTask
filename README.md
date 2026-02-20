# CloudTask

Cloudflare エコシステム上に構築されたプロジェクト管理ツール。
タスク管理・可視化・コラボレーション機能をフルスタックで実装したポートフォリオプロジェクトです。

**Live Demo:** https://cloudtask-web.pages.dev

> デモアカウントはログイン画面のワンクリックボタンからお試しいただけます。

---

## Features

### Phase 1: Core
- **Task Management** — 作成・編集・削除、担当者割り当て、優先度・期限設定
- **Kanban Board** — ドラッグ&ドロップでステータス変更
- **Project Management** — プロジェクト作成、メンバー管理、権限制御（Admin / Member / Viewer）
- **Comment System** — タスクへのコメント、@メンション通知

### Phase 2: Visualization
- **Gantt Chart** — タイムライン表示、タスク依存関係の可視化
- **Dashboard** — プロジェクト進捗サマリー
- **Reports** — タスク分析・完了率レポート

### Phase 3: Collaboration
- **Wiki** — Markdown形式のドキュメント管理、バージョン履歴
- **File Attachments** — タスクへのファイル添付（R2 Storage）
- **Real-time Notifications** — WebSocket経由のリアルタイム通知

### Phase 4: Advanced
- **Workflow Editor** — カスタムステータス遷移ルール
- **Automation Rules** — トリガーベースの自動処理
- **Custom Fields** — プロジェクト固有のフィールド定義
- **Templates** — プロジェクト・タスクテンプレート

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Cloudflare Workers (Hono v4) |
| **Database** | Cloudflare D1 (SQLite) |
| **Session/Cache** | Cloudflare KV *(bindings retained; active use removed — see Notes)* |
| **File Storage** | Cloudflare R2 |
| **Real-time** | Durable Objects + WebSocket |
| **Frontend** | React 19 + TypeScript + Vite 6 |
| **Styling** | Tailwind CSS 4 |
| **Data Fetching** | TanStack Query v5 |
| **Drag & Drop** | @dnd-kit |
| **Charts** | Recharts |
| **Validation** | Zod |
| **CI/CD** | GitHub Actions |

---

## Architecture

```
                    +-----------------+
                    | Cloudflare CDN  |
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+       +-----------v-----------+
    |  Cloudflare Pages |       |  Cloudflare Workers   |
    |  (React SPA)      |       |  (Hono REST API)      |
    +-------------------+       +-----------+-----------+
                                            |
                    +-----------+-----------+-----------+
                    |           |           |           |
               +----v---+  +---v----+  +---v----+  +---v--------+
               |   D1   |  |   KV   |  |   R2   |  |  Durable   |
               | (Data) |  | (Cache)|  | (Files)|  |  Objects   |
               +--------+  +--------+  +--------+  | (WebSocket)|
                                                    +------------+
```

---

## Project Structure

```
CloudTask/
├── apps/
│   ├── api/                  # Cloudflare Workers API (Hono)
│   │   ├── src/
│   │   │   ├── routes/       # 14 route files (60+ endpoints)
│   │   │   ├── services/     # 14 business logic services
│   │   │   ├── middleware/   # Auth, CORS, rate-limit
│   │   │   └── durable-objects/  # WebSocket manager
│   │   ├── schema.sql        # D1 database schema (20 tables)
│   │   ├── seed.sql          # Sample data
│   │   └── wrangler.jsonc    # Cloudflare Workers config
│   └── web/                  # React SPA
│       └── src/
│           ├── pages/        # 15 page components
│           ├── components/   # 32 UI components
│           ├── hooks/        # 14 custom hooks (TanStack Query)
│           ├── api/          # API client
│           └── stores/       # Auth state management
├── packages/
│   └── shared/               # Shared types, validators, utilities
└── .github/
    └── workflows/
        └── deploy.yml        # CI/CD pipeline
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Cloudflare account (free plan)
- Wrangler CLI: `npm install -g wrangler`

### Local Development

```bash
# 1. Clone & install
git clone https://github.com/YOUR_USERNAME/CloudTask.git
cd CloudTask
npm run install:all

# 2. Set up wrangler config
cp apps/api/wrangler.jsonc.example apps/api/wrangler.jsonc
# Edit wrangler.jsonc — fill in your D1/KV IDs

# 3. Initialize local database
npm run db:init
npm run db:seed

# 4. Start API (port 8787)
npm run dev:api

# 5. Start Web (port 5173) — in another terminal
npm run dev:web
```

Open http://localhost:5173 and use a demo account to log in.

### Demo Accounts

| Account | Email | Password |
|---|---|---|
| Admin | admin@example.com | password123 |
| Alice | member1@example.com | password123 |
| Bob | member2@example.com | password123 |

### Setting Up Cloudflare Resources

```bash
# Create D1 database
npx wrangler d1 create cloudtask-db

# Create KV namespaces (bindings required by wrangler.jsonc even if not actively used)
npx wrangler kv namespace create SESSIONS
npx wrangler kv namespace create CACHE

# Set JWT secret (never commit this to wrangler.jsonc)
npx wrangler secret put JWT_SECRET

# Apply schema & seed to remote DB
cd apps/api
npx wrangler d1 execute cloudtask-db --remote --file=./schema.sql
npx wrangler d1 execute cloudtask-db --remote --file=./seed.sql
```

---

## Deployment

### Automatic (CI/CD)

Push to `main` branch triggers GitHub Actions:

```
git push → Type Check → Deploy API (Workers) + Deploy Web (Pages)
```

Required GitHub Secrets:

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers & Pages permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Manual

```bash
# Deploy API
cd apps/api && npx wrangler deploy

# Build & Deploy Web
cd apps/web && npx vite build --mode production
npx wrangler pages deploy dist --project-name=cloudtask-web --commit-dirty=true
```

---

## API Overview

Base URL: `https://cloudtask-api.ssdevhome.workers.dev/api/v1`

| Resource | Endpoints | Description |
|---|---|---|
| `/auth` | 4 | Register, Login, Logout, Me |
| `/users` | 3 | Profile, Search |
| `/projects` | 8 | CRUD + Member management |
| `/tasks` | 8 | CRUD + Labels + Subtasks |
| `/comments` | 4 | CRUD per task |
| `/labels` | 3 | Project labels |
| `/notifications` | 4 | List, Read, Mark all |
| `/activity` | 1 | Activity feed |
| `/wiki` | 7 | Wiki pages + versions |
| `/attachments` | 5 | Upload, Download, Delete |
| `/workflows` | 6 | Custom workflow management |
| `/automations` | 6 | Automation rules |
| `/custom-fields` | 6 | Field definitions + values |
| `/templates` | 5 | Project templates |

---

## Notes & Known Limitations

### Authentication
JWT-only authentication — no KV session store. This means:
- Auth is **stateless**: every request is validated by JWT signature + expiry only
- **Logout is client-side**: the token remains technically valid until expiry (7 days) after logout
- This is an intentional trade-off to stay within Cloudflare's free plan KV quota (1,000 writes/day)

For production use, re-enable KV-backed sessions (`createSession` / `deleteSession` in `auth.service.ts`) and restore the session lookup in `middleware/auth.ts`.

### Rate Limiting
KV-based rate limiting is disabled for the same reason (1 read + 1 write per request exhausted the daily quota).
Alternatives: [Cloudflare WAF Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/) or the [Workers Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

### Other
- **R2 Storage**: File attachment feature requires R2 to be enabled in Cloudflare Dashboard
- **E2E Tests**: Playwright-based E2E tests are not yet implemented
- **JWT Secret**: Managed via `wrangler secret put JWT_SECRET` — never committed to `wrangler.jsonc`

---

## License

MIT
