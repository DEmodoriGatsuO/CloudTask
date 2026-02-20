// Seed SQL statements for periodic data reset
// These statements correspond to the contents of seed.sql

export const DELETE_STATEMENTS = [
  'DELETE FROM comments',
  'DELETE FROM task_labels',
  'DELETE FROM task_dependencies',
  'DELETE FROM activity_logs',
  'DELETE FROM notifications',
  'DELETE FROM attachments',
  'DELETE FROM custom_field_values',
  'DELETE FROM custom_field_definitions',
  'DELETE FROM automation_rules',
  'DELETE FROM workflows',
  'DELETE FROM wiki_page_versions',
  'DELETE FROM wiki_pages',
  'DELETE FROM project_templates',
  'DELETE FROM tasks',
  'DELETE FROM labels',
  'DELETE FROM project_members',
  'DELETE FROM projects',
  'DELETE FROM users',
];

export const SEED_SQL = `
INSERT OR IGNORE INTO users (id, email, password_hash, display_name, role, created_at, updated_at)
VALUES
  ('user_admin01', 'admin@example.com', '$2a$10$LO42IaSWzjxSXGAt4QJyyegyMBgJWOZmWoctHvYAODLFDUSz5XzoW', 'Admin User', 'admin', 1700000000, 1700000000),
  ('user_member01', 'member1@example.com', '$2a$10$LO42IaSWzjxSXGAt4QJyyegyMBgJWOZmWoctHvYAODLFDUSz5XzoW', 'Alice Smith', 'member', 1700000000, 1700000000),
  ('user_member02', 'member2@example.com', '$2a$10$LO42IaSWzjxSXGAt4QJyyegyMBgJWOZmWoctHvYAODLFDUSz5XzoW', 'Bob Johnson', 'member', 1700000000, 1700000000);

INSERT OR IGNORE INTO projects (id, name, description, status, owner_id, created_at, updated_at)
VALUES
  ('proj_001', 'Website Redesign', 'Redesign company website with modern UI', 'active', 'user_admin01', 1700000000, 1700000000),
  ('proj_002', 'Mobile App Development', 'Build iOS and Android mobile app', 'active', 'user_member01', 1700000000, 1700000000);

INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, joined_at)
VALUES
  ('pm_001', 'proj_001', 'user_admin01', 'project_admin', 1700000000),
  ('pm_002', 'proj_001', 'user_member01', 'member', 1700000000),
  ('pm_003', 'proj_001', 'user_member02', 'member', 1700000000),
  ('pm_004', 'proj_002', 'user_member01', 'project_admin', 1700000000),
  ('pm_005', 'proj_002', 'user_member02', 'member', 1700000000);

INSERT OR IGNORE INTO tasks (id, project_id, title, description, status, priority, assignee_id, reporter_id, sort_order, start_date, end_date, created_at, updated_at)
VALUES
  ('task_001', 'proj_001', 'Design mockups', 'Create UI mockups for homepage', 'todo', 'high', 'user_member01', 'user_admin01', 1.0, 1700000000000, 1700604800000, 1700000000000, 1700000000000),
  ('task_002', 'proj_001', 'Set up project structure', 'Initialize React project', 'in_progress', 'high', 'user_member02', 'user_admin01', 2.0, 1700604800000, 1701209600000, 1700000000000, 1700000000000),
  ('task_003', 'proj_001', 'Write content', 'Write copy for all pages', 'todo', 'medium', 'user_member01', 'user_admin01', 3.0, 1701209600000, 1702073600000, 1700000000000, 1700000000000),
  ('task_004', 'proj_001', 'Implement responsive design', 'Make site responsive', 'todo', 'medium', NULL, 'user_admin01', 4.0, 1702073600000, 1702678400000, 1700000000000, 1700000000000),
  ('task_005', 'proj_002', 'Design app screens', 'Create Figma designs', 'in_progress', 'high', 'user_member01', 'user_member01', 1.0, 1700000000000, 1701209600000, 1700000000000, 1700000000000),
  ('task_006', 'proj_002', 'Set up React Native', 'Initialize RN project', 'done', 'high', 'user_member02', 'user_member01', 2.0, 1700604800000, 1701814400000, 1700000000000, 1700000000000);

INSERT OR IGNORE INTO labels (id, project_id, name, color, created_at)
VALUES
  ('label_001', 'proj_001', 'Bug', '#ef4444', 1700000000),
  ('label_002', 'proj_001', 'Feature', '#3b82f6', 1700000000),
  ('label_003', 'proj_001', 'Enhancement', '#8b5cf6', 1700000000),
  ('label_004', 'proj_002', 'Bug', '#ef4444', 1700000000),
  ('label_005', 'proj_002', 'Feature', '#3b82f6', 1700000000);

INSERT OR IGNORE INTO comments (id, task_id, user_id, content, created_at, updated_at)
VALUES
  ('comment_001', 'task_001', 'user_admin01', 'Please prioritize the homepage design first.', 1700001000, 1700001000),
  ('comment_002', 'task_002', 'user_member02', 'Started setting up the project. Using Vite + React.', 1700002000, 1700002000);
`;
