-- =============================================================
-- CloudTask Seed Data
-- Purpose: Portfolio demo + visualization feature testing
-- Password for all users: "password123" (bcrypt, 10 rounds)
--
-- Timestamp conventions:
--   created_at / updated_at / joined_at : Unix seconds (10 digits)
--   start_date / due_date / end_date    : Unix milliseconds (13 digits)
--
-- Relative to seed execution date (approx. 2026-02-19):
--   now    = 1771463217 sec  /  1771463217003 ms
--   -30d   = 1768871217 sec  /  1768871217003 ms
--   -14d   = 1770253617 sec  /  1770253617003 ms
--   -7d    = 1770858417 sec  /  1770858417003 ms
--   -3d    = 1771204017 sec  /  1771204017003 ms
--   -1d    = 1771376817 sec  /  1771376817003 ms
--   +1d    = 1771549617 sec  /  1771549617003 ms
--   +3d    = 1771722417 sec  /  1771722417003 ms
--   +7d    = 1772068017 sec  /  1772068017003 ms
--   +14d   = 1772672817 sec  /  1772672817003 ms
--   +30d   = 1774055217 sec  /  1774055217003 ms
--   +60d   = 1776647217 sec  /  1776647217003 ms
--   +90d   = 1779239217 sec  /  1779239217003 ms
-- =============================================================


-- ============================================================
-- USERS  (3 accounts, all password: "password123")
-- ============================================================
INSERT OR IGNORE INTO users (id, email, password_hash, display_name, role, created_at, updated_at)
VALUES
  ('user_admin01',  'admin@example.com',   '$2a$10$LO42IaSWzjxSXGAt4QJyyegyMBgJWOZmWoctHvYAODLFDUSz5XzoW', 'Admin User',  'admin',  1768871217, 1771463217),
  ('user_member01', 'member1@example.com', '$2a$10$LO42IaSWzjxSXGAt4QJyyegyMBgJWOZmWoctHvYAODLFDUSz5XzoW', 'Alice Smith', 'member', 1768871217, 1771463217),
  ('user_member02', 'member2@example.com', '$2a$10$LO42IaSWzjxSXGAt4QJyyegyMBgJWOZmWoctHvYAODLFDUSz5XzoW', 'Bob Johnson', 'member', 1768871217, 1771463217);


-- ============================================================
-- PROJECTS  (2 projects)
-- ============================================================
INSERT OR IGNORE INTO projects (id, name, description, status, owner_id, created_at, updated_at)
VALUES
  ('proj_001', 'Website Redesign',       'Redesign company website with modern UI/UX', 'active', 'user_admin01',  1768871217, 1771463217),
  ('proj_002', 'Mobile App Development', 'Build cross-platform iOS/Android mobile app', 'active', 'user_member01', 1769130417, 1771463217);


-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, joined_at)
VALUES
  ('pm_001', 'proj_001', 'user_admin01',  'project_admin', 1768871217),
  ('pm_002', 'proj_001', 'user_member01', 'member',        1768871217),
  ('pm_003', 'proj_001', 'user_member02', 'member',        1768871217),
  ('pm_004', 'proj_002', 'user_member01', 'project_admin', 1769130417),
  ('pm_005', 'proj_002', 'user_member02', 'member',        1769130417),
  ('pm_006', 'proj_002', 'user_admin01',  'member',        1769130417);


-- ============================================================
-- LABELS
-- ============================================================
INSERT OR IGNORE INTO labels (id, project_id, name, color, created_at)
VALUES
  ('label_001', 'proj_001', 'Bug',         '#ef4444', 1768871217),
  ('label_002', 'proj_001', 'Feature',     '#3b82f6', 1768871217),
  ('label_003', 'proj_001', 'Enhancement', '#8b5cf6', 1768871217),
  ('label_004', 'proj_001', 'Design',      '#f59e0b', 1768871217),
  ('label_005', 'proj_002', 'Bug',         '#ef4444', 1769130417),
  ('label_006', 'proj_002', 'Feature',     '#3b82f6', 1769130417),
  ('label_007', 'proj_002', 'Backend',     '#10b981', 1769130417);


-- ============================================================
-- TASKS — proj_001: Website Redesign
--
-- Visualization coverage matrix:
--   期限切れ (due_date < now)     : task_001, task_002, task_003, task_012
--   今日〜1日以内                  : task_004
--   7日以内                        : task_005, task_006
--   将来                           : task_007, task_008, task_009
--   マイルストーン (is_milestone=1) : task_010
--   サブタスク (parent_task_id)    : task_011, task_012
--   担当者なし                     : task_009
--   ステータス全種                 : todo / in_progress / done / completed
--   進捗率バリエーション           : 0 / 30 / 60 / 80 / 100
-- ============================================================
INSERT OR IGNORE INTO tasks (
  id, project_id, title, description,
  status, priority,
  assignee_id, reporter_id, parent_task_id,
  due_date, start_date, end_date,
  estimated_hours, actual_hours,
  sort_order, is_milestone, progress,
  created_at, updated_at
)
VALUES
  -- ① 期限切れ・未着手 (overdue / todo / progress=0)
  ('task_001', 'proj_001',
   'Design mockups',
   'Create UI mockups for homepage and key landing pages. Needs review from stakeholders.',
   'todo', 'high',
   'user_member01', 'user_admin01', NULL,
   1770253617003,   -- due_date:   -14d (期限切れ)
   1768871217003,   -- start_date: -30d
   1770253617003,   -- end_date:   -14d
   16.0, NULL,
   1.0, 0, 0,
   1768871217, 1771463217),

  -- ② 期限切れ・進行中 (overdue / in_progress / progress=60)
  ('task_002', 'proj_001',
   'Set up project structure',
   'Initialize React + Vite project, configure Tailwind CSS, set up routing and folder structure.',
   'in_progress', 'high',
   'user_member02', 'user_admin01', NULL,
   1771204017003,   -- due_date:   -3d (期限切れ)
   1770253617003,   -- start_date: -14d
   1771204017003,   -- end_date:   -3d
   24.0, 18.0,
   2.0, 0, 60,
   1770253617, 1771463217),

  -- ③ 期限切れだが完了済み・遅延完了パターン (due overdue / done / progress=100)
  ('task_003', 'proj_001',
   'Write content strategy',
   'Define copywriting guidelines, tone of voice, and draft copy for all main pages.',
   'done', 'medium',
   'user_member01', 'user_admin01', NULL,
   1771376817003,   -- due_date:   -1d (昨日期限だったが完了)
   1770858417003,   -- start_date: -7d
   1771376817003,   -- end_date:   -1d
   8.0, 9.5,
   3.0, 0, 100,
   1770858417, 1771463217),

  -- ④ 今日〜1日以内の期限・進行中 (today / in_progress / progress=30)
  ('task_004', 'proj_001',
   'Implement responsive design',
   'Apply mobile-first responsive layout across all pages using Tailwind breakpoints.',
   'in_progress', 'high',
   'user_member02', 'user_admin01', NULL,
   1771549617003,   -- due_date:   +1d
   1771204017003,   -- start_date: -3d
   1771549617003,   -- end_date:   +1d
   12.0, 6.0,
   4.0, 0, 30,
   1771204017, 1771463217),

  -- ⑤ 7日以内の期限・未着手 (within 7d / todo / progress=0)
  ('task_005', 'proj_001',
   'Accessibility audit',
   'Run axe-core and manual screen reader checks. Fix WCAG 2.1 AA violations.',
   'todo', 'medium',
   'user_member01', 'user_admin01', NULL,
   1772068017003,   -- due_date:   +7d
   1771549617003,   -- start_date: +1d
   1772068017003,   -- end_date:   +7d
   8.0, NULL,
   5.0, 0, 0,
   1771463217, 1771463217),

  -- ⑥ 3日以内の期限・進行中 (within 3d / in_progress / progress=80)
  ('task_006', 'proj_001',
   'Performance optimization',
   'Lighthouse audit, image optimization, lazy loading, bundle size reduction.',
   'in_progress', 'medium',
   'user_member02', 'user_admin01', NULL,
   1771722417003,   -- due_date:   +3d
   1771463217003,   -- start_date: now
   1771722417003,   -- end_date:   +3d
   10.0, 2.0,
   6.0, 0, 80,
   1771463217, 1771463217),

  -- ⑦ 将来期限・未着手 (future / todo / progress=0)
  ('task_007', 'proj_001',
   'SEO meta tags implementation',
   'Add structured data, Open Graph tags, and sitemap.xml for all pages.',
   'todo', 'low',
   'user_member01', 'user_admin01', NULL,
   1772672817003,   -- due_date:   +14d
   1772068017003,   -- start_date: +7d
   1772672817003,   -- end_date:   +14d
   6.0, NULL,
   7.0, 0, 0,
   1771463217, 1771463217),

  -- ⑧ 将来期限・早期完了 (future due_date / completed / progress=100)
  ('task_008', 'proj_001',
   'Browser compatibility testing',
   'Test on Chrome, Firefox, Safari, Edge. Document and fix any rendering issues.',
   'completed', 'medium',
   'user_member02', 'user_admin01', NULL,
   1774055217003,   -- due_date:   +30d (余裕あり)
   1770858417003,   -- start_date: -7d
   1771463217003,   -- end_date:   now (早期完了)
   12.0, 10.0,
   8.0, 0, 100,
   1770858417, 1771463217),

  -- ⑨ 将来期限・担当者なし (future / unassigned / todo)
  ('task_009', 'proj_001',
   'Analytics integration',
   'Integrate GA4 and set up custom events for key user interactions.',
   'todo', 'low',
   NULL, 'user_admin01', NULL,
   1776647217003,   -- due_date:   +60d
   1774055217003,   -- start_date: +30d
   1776647217003,   -- end_date:   +60d
   8.0, NULL,
   9.0, 0, 0,
   1771463217, 1771463217),

  -- ⑩ マイルストーン: デザインフェーズ完了 (is_milestone=1)
  ('task_010', 'proj_001',
   'Design Phase Complete',
   'Milestone: All design deliverables reviewed and approved by stakeholders.',
   'todo', 'high',
   'user_admin01', 'user_admin01', NULL,
   1772672817003,   -- due_date:   +14d (milestone date)
   1772672817003,   -- start_date: +14d
   1772672817003,   -- end_date:   +14d
   NULL, NULL,
   10.0, 1, 0,
   1771463217, 1771463217),

  -- ⑪ サブタスク (parent=task_001 / done / progress=100)
  ('task_011', 'proj_001',
   'Homepage hero mockup',
   'Design hero section with main CTA, background image, and responsive breakpoints.',
   'done', 'high',
   'user_member01', 'user_member01', 'task_001',
   1769735817003,   -- due_date:   -20d (期限切れ・完了)
   1768871217003,   -- start_date: -30d
   1769735817003,   -- end_date:   -20d
   6.0, 5.5,
   1.1, 0, 100,
   1768871217, 1770253617),

  -- ⑫ サブタスク (parent=task_001 / todo / overdue / progress=0)
  ('task_012', 'proj_001',
   'Navigation and footer mockup',
   'Design global navigation bar, mega menu, and footer layout.',
   'todo', 'medium',
   'user_member01', 'user_member01', 'task_001',
   1770858417003,   -- due_date:   -7d (期限切れ)
   1769735817003,   -- start_date: -20d
   1770858417003,   -- end_date:   -7d
   6.0, NULL,
   1.2, 0, 0,
   1769735817, 1771463217);


-- ============================================================
-- TASKS — proj_002: Mobile App Development
--
-- Visualization coverage:
--   依存関係チェーン (ガントチャート): task_021 → task_022 → task_023/024 → task_025 → task_027
--   全ステータス: completed / in_progress / todo
--   マイルストーン: task_027
--   担当者なし: task_028
-- ============================================================
INSERT OR IGNORE INTO tasks (
  id, project_id, title, description,
  status, priority,
  assignee_id, reporter_id, parent_task_id,
  due_date, start_date, end_date,
  estimated_hours, actual_hours,
  sort_order, is_milestone, progress,
  created_at, updated_at
)
VALUES
  -- ① 完了済み・過去 (dependency chain の起点 / progress=100)
  ('task_021', 'proj_002',
   'Tech stack decision',
   'Evaluate React Native vs Flutter. Document tradeoffs and get team sign-off.',
   'completed', 'high',
   'user_member01', 'user_member01', NULL,
   1769130417003,   -- due_date:   -30d
   1768871217003,   -- start_date: -30d
   1769130417003,   -- end_date:   -30d
   8.0, 6.0,
   1.0, 0, 100,
   1768871217, 1769476017),

  -- ② 期限切れ・進行中 (overdue / in_progress / progress=60)
  ('task_022', 'proj_002',
   'Design app screens',
   'Create Figma designs for onboarding, home, profile, and settings screens.',
   'in_progress', 'high',
   'user_member01', 'user_member01', NULL,
   1771204017003,   -- due_date:   -3d (期限切れ)
   1769476017003,   -- start_date: -23d
   1771204017003,   -- end_date:   -3d
   32.0, 25.0,
   2.0, 0, 60,
   1769476017, 1771463217),

  -- ③ 今日〜3日以内の期限・進行中 (within 3d / in_progress / progress=30)
  ('task_023', 'proj_002',
   'Set up React Native project',
   'Initialize Expo project, configure ESLint, Prettier, navigation library.',
   'in_progress', 'high',
   'user_member02', 'user_member01', NULL,
   1771722417003,   -- due_date:   +3d
   1771204017003,   -- start_date: -3d
   1771722417003,   -- end_date:   +3d
   16.0, 8.0,
   3.0, 0, 30,
   1771204017, 1771463217),

  -- ④ 7日以内の期限・未着手 (within 7d / todo / progress=0)
  ('task_024', 'proj_002',
   'Implement authentication flow',
   'Build login, signup, password reset screens with JWT auth integration.',
   'todo', 'high',
   'user_member02', 'user_member01', NULL,
   1772068017003,   -- due_date:   +7d
   1771722417003,   -- start_date: +3d
   1772068017003,   -- end_date:   +7d
   20.0, NULL,
   4.0, 0, 0,
   1771463217, 1771463217),

  -- ⑤ 将来・未着手 (future / todo / progress=0)
  ('task_025', 'proj_002',
   'API integration layer',
   'Implement REST client, error handling, caching with React Query.',
   'todo', 'medium',
   'user_admin01', 'user_member01', NULL,
   1774055217003,   -- due_date:   +30d
   1772672817003,   -- start_date: +14d
   1774055217003,   -- end_date:   +30d
   24.0, NULL,
   5.0, 0, 0,
   1771463217, 1771463217),

  -- ⑥ 将来・未着手 (future / todo / progress=0)
  ('task_026', 'proj_002',
   'Push notification setup',
   'Configure Firebase Cloud Messaging, implement foreground/background handlers.',
   'todo', 'medium',
   'user_member01', 'user_member01', NULL,
   1774055217003,   -- due_date:   +30d
   1772672817003,   -- start_date: +14d
   1774055217003,   -- end_date:   +30d
   12.0, NULL,
   6.0, 0, 0,
   1771463217, 1771463217),

  -- ⑦ マイルストーン: Alpha Release (is_milestone=1)
  ('task_027', 'proj_002',
   'Alpha Release',
   'Milestone: Internal alpha build ready for QA testing.',
   'todo', 'high',
   'user_member01', 'user_member01', NULL,
   1776647217003,   -- due_date:   +60d
   1776647217003,   -- start_date: +60d (milestone)
   1776647217003,   -- end_date:   +60d
   NULL, NULL,
   7.0, 1, 0,
   1771463217, 1771463217),

  -- ⑧ 担当者なし・将来 (unassigned / future / todo)
  ('task_028', 'proj_002',
   'App Store submission',
   'Prepare screenshots, metadata, privacy policy. Submit for App Store review.',
   'todo', 'low',
   NULL, 'user_member01', NULL,
   1779239217003,   -- due_date:   +90d
   1776647217003,   -- start_date: +60d
   1779239217003,   -- end_date:   +90d
   16.0, NULL,
   8.0, 0, 0,
   1771463217, 1771463217);


-- ============================================================
-- TASK DEPENDENCIES (ガントチャート依存関係テスト用)
--
-- proj_001: task_001 ──→ task_010 (Design milestone)
--           task_006 ──→ task_010
--
-- proj_002: task_021 → task_022 → task_023 ─→ task_025 → task_027
--                              → task_024 ─↗
--           task_026 ──────────────────────────────────→ task_027
-- ============================================================
INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id)
VALUES
  -- proj_001
  ('task_010', 'task_001'),
  ('task_010', 'task_006'),

  -- proj_002
  ('task_022', 'task_021'),
  ('task_023', 'task_022'),
  ('task_024', 'task_022'),
  ('task_025', 'task_023'),
  ('task_025', 'task_024'),
  ('task_027', 'task_025'),
  ('task_027', 'task_026');


-- ============================================================
-- TASK LABELS
-- ============================================================
INSERT OR IGNORE INTO task_labels (task_id, label_id)
VALUES
  ('task_001', 'label_004'),
  ('task_002', 'label_002'),
  ('task_003', 'label_002'),
  ('task_004', 'label_003'),
  ('task_005', 'label_003'),
  ('task_006', 'label_003'),
  ('task_007', 'label_002'),
  ('task_011', 'label_004'),
  ('task_012', 'label_004'),
  ('task_022', 'label_006'),
  ('task_023', 'label_007'),
  ('task_024', 'label_007'),
  ('task_025', 'label_007'),
  ('task_026', 'label_007');


-- ============================================================
-- COMMENTS
-- ============================================================
INSERT OR IGNORE INTO comments (id, task_id, user_id, content, created_at, updated_at)
VALUES
  ('comment_001', 'task_001', 'user_admin01',
   'Homepage hero design should take priority — stakeholder review is scheduled for next week.',
   1769476017, 1769476017),
  ('comment_002', 'task_001', 'user_member01',
   'Completed the hero section mockup. Working on navigation next. @Bob please review when ready.',
   1769735817, 1769735817),
  ('comment_003', 'task_002', 'user_member02',
   'Vite + React + Tailwind setup is done. Created folder structure per design system guidelines.',
   1770253617, 1770253617),
  ('comment_004', 'task_002', 'user_admin01',
   'This is now overdue — please update the status and provide a revised ETA.',
   1771376817, 1771376817),
  ('comment_005', 'task_006', 'user_member02',
   'First Lighthouse run: Performance 68, Accessibility 92. Targeting 90+ on all metrics.',
   1771463217, 1771463217),
  ('comment_006', 'task_022', 'user_member01',
   'Screen designs for onboarding and home are done. Profile and settings still in progress.',
   1771204017, 1771204017),
  ('comment_007', 'task_023', 'user_member02',
   'Expo project initialized. React Navigation v7 configured with bottom tab navigator.',
   1771376817, 1771376817);


-- ============================================================
-- ACTIVITY LOGS (ダッシュボード・アクティビティ表示テスト用)
-- ============================================================
INSERT OR IGNORE INTO activity_logs (id, project_id, task_id, user_id, action, details, created_at)
VALUES
  ('act_001', 'proj_001', 'task_001', 'user_admin01',  'task_created',    '{"title":"Design mockups"}',                     1768871217),
  ('act_002', 'proj_001', 'task_002', 'user_admin01',  'task_created',    '{"title":"Set up project structure"}',           1768871217),
  ('act_003', 'proj_001', 'task_011', 'user_member01', 'task_created',    '{"title":"Homepage hero mockup"}',               1768871217),
  ('act_004', 'proj_001', 'task_011', 'user_member01', 'status_changed',  '{"from":"todo","to":"done"}',                    1770253617),
  ('act_005', 'proj_001', 'task_003', 'user_member01', 'status_changed',  '{"from":"in_progress","to":"done"}',             1771376817),
  ('act_006', 'proj_001', 'task_008', 'user_member02', 'status_changed',  '{"from":"in_progress","to":"completed"}',        1771463217),
  ('act_007', 'proj_002', 'task_021', 'user_member01', 'status_changed',  '{"from":"in_progress","to":"completed"}',        1769476017),
  ('act_008', 'proj_002', 'task_022', 'user_member01', 'task_created',    '{"title":"Design app screens"}',                 1769476017),
  ('act_009', 'proj_001', 'task_006', 'user_member02', 'progress_updated','{"progress":80}',                                1771463217),
  ('act_010', 'proj_002', 'task_023', 'user_member02', 'progress_updated','{"progress":30}',                                1771376817);


-- ============================================================
-- NOTIFICATIONS (通知機能・未読バッジテスト用)
-- ============================================================
INSERT OR IGNORE INTO notifications (id, user_id, task_id, type, title, message, is_read, created_at)
VALUES
  -- admin: 期限切れ通知 (未読)
  ('notif_001', 'user_admin01', 'task_001', 'due_date',
   'タスクの期限が過ぎています',
   '"Design mockups" の期限が 14 日前に切れています。担当者に確認してください。',
   0, 1770858417),
  ('notif_002', 'user_admin01', 'task_002', 'due_date',
   'タスクの期限が過ぎています',
   '"Set up project structure" の期限が 3 日前に切れています。',
   0, 1771204017),

  -- member01: 期限切れ + コメント通知 (未読)
  ('notif_003', 'user_member01', 'task_001', 'due_date',
   '担当タスクの期限が過ぎています',
   '"Design mockups" の期限が過ぎています。進捗を更新してください。',
   0, 1770858417),
  ('notif_004', 'user_member01', 'task_012', 'due_date',
   '担当タスクの期限が過ぎています',
   '"Navigation and footer mockup" の期限が 7 日前に切れています。',
   0, 1771204017),
  ('notif_005', 'user_member01', 'task_002', 'comment',
   'コメントが追加されました',
   'Admin User が "Set up project structure" にコメントしました。',
   0, 1771376817),

  -- member02: 既読 + 未読の混在
  ('notif_006', 'user_member02', 'task_002', 'due_date',
   '担当タスクの期限が過ぎています',
   '"Set up project structure" の期限が過ぎています。',
   1, 1771204017),
  ('notif_007', 'user_member02', 'task_004', 'due_date',
   'タスクの期限が近づいています',
   '"Implement responsive design" の期限まであと 1 日です。',
   0, 1771376817),
  ('notif_008', 'user_member02', 'task_023', 'due_date',
   '担当タスクの期限が近づいています',
   '"Set up React Native project" の期限まであと 3 日です。',
   0, 1771376817);


-- ============================================================
-- WIKI PAGES (Wiki Markdown プレビューテスト用)
-- ============================================================
INSERT OR IGNORE INTO wiki_pages (
  id, project_id, title, content, parent_page_id,
  created_by, updated_by, created_at, updated_at
)
VALUES
  ('wiki_001', 'proj_001',
   'プロジェクト概要',
   '# Website Redesign — プロジェクト概要

## 目的

企業サイトを最新の UI/UX トレンドに合わせてリデザインし、コンバージョン率の向上とブランドイメージの刷新を目指す。

## スコープ

- トップページ・製品ページ・問い合わせページのリデザイン
- レスポンシブ対応（モバイルファースト）
- パフォーマンス最適化（Lighthouse スコア 90+）
- アクセシビリティ対応（WCAG 2.1 AA）

## スケジュール

| フェーズ | 期間 | 担当 |
|---|---|---|
| デザイン | -30d 〜 +14d | Alice Smith |
| 実装 | -14d 〜 +30d | Bob Johnson |
| テスト | +14d 〜 +45d | 全員 |

## ステークホルダー

- **スポンサー**: Admin User
- **デザイン**: Alice Smith
- **実装**: Bob Johnson
',
   NULL, 'user_admin01', 'user_admin01', 1768871217, 1771463217),

  ('wiki_002', 'proj_001',
   'デザインガイドライン',
   '# デザインガイドライン

## カラーパレット

- **Primary**: `#4f46e5` (Indigo 600)
- **Surface**: `#ffffff`
- **On Surface**: `#1e293b`

## タイポグラフィ

- **見出し**: Roboto Bold / 700
- **本文**: Roboto Regular / 400
- **コード**: Roboto Mono

## コンポーネント原則

1. モバイルファーストで設計する
2. アクセシビリティを最初から考慮する
3. Tailwind CSS のユーティリティクラスを活用する

## チェックリスト

- [ ] カラー定義完了
- [ ] フォント選定完了
- [ ] コンポーネントライブラリ選定
- [ ] デザイントークン設定
',
   'wiki_001', 'user_member01', 'user_member01', 1769476017, 1771463217),

  ('wiki_003', 'proj_002',
   'Mobile App 技術仕様',
   '# Mobile App 技術仕様

## 採用技術

| カテゴリ | 技術 | バージョン |
|---|---|---|
| Framework | React Native (Expo) | 0.74 |
| 言語 | TypeScript | 5.x |
| 状態管理 | TanStack Query | 5.x |
| ナビゲーション | React Navigation | 7.x |

## API 設計方針

- RESTful API（既存 CloudTask API を流用）
- 認証: JWT Bearer Token
- エラーハンドリング: 統一レスポンス形式

```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

## ビルド・配布

- **iOS**: Expo EAS Build → App Store
- **Android**: Expo EAS Build → Google Play
',
   NULL, 'user_member01', 'user_member01', 1769476017, 1771463217);
