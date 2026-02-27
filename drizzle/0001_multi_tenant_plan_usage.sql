PRAGMA foreign_keys=OFF;

-- Ensure a fallback user exists for legacy data migration.
INSERT OR IGNORE INTO users (id, name, email, created_at, updated_at)
VALUES ('legacy-user', 'Legacy User', 'legacy-user@unknown.local', datetime('now'), datetime('now'));

-- user_profile: migrate from global row to per-user rows.
CREATE TABLE user_profile_new (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  skills TEXT NOT NULL DEFAULT '[]',
  experience_years INTEGER NOT NULL DEFAULT 0,
  experience_level TEXT NOT NULL DEFAULT 'Pleno',
  preferred_contract_types TEXT NOT NULL DEFAULT '["CLT","PJ"]',
  preferred_locations TEXT NOT NULL DEFAULT '[]',
  prefer_remote INTEGER NOT NULL DEFAULT 1,
  min_salary REAL,
  max_salary REAL,
  bio TEXT,
  highlights TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  UNIQUE(user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO user_profile_new (
  id,
  user_id,
  name,
  email,
  phone,
  linkedin_url,
  github_url,
  portfolio_url,
  resume_url,
  skills,
  experience_years,
  experience_level,
  preferred_contract_types,
  preferred_locations,
  prefer_remote,
  min_salary,
  max_salary,
  bio,
  highlights,
  updated_at
)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  COALESCE(p.name, ''),
  COALESCE(NULLIF(p.email, ''), u.email, ''),
  p.phone,
  p.linkedin_url,
  p.github_url,
  p.portfolio_url,
  p.resume_url,
  COALESCE(p.skills, '[]'),
  COALESCE(p.experience_years, 0),
  COALESCE(p.experience_level, 'Pleno'),
  COALESCE(p.preferred_contract_types, '["CLT","PJ"]'),
  COALESCE(p.preferred_locations, '[]'),
  COALESCE(p.prefer_remote, 1),
  p.min_salary,
  p.max_salary,
  p.bio,
  COALESCE(p.highlights, '[]'),
  COALESCE(p.updated_at, datetime('now'))
FROM users u
LEFT JOIN user_profile p ON p.id = 'default';

DROP TABLE user_profile;
ALTER TABLE user_profile_new RENAME TO user_profile;

-- outreach_records: add user_id and prevent duplicate drafts/sends per user+job.
CREATE TABLE outreach_records_new (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'none',
  email_subject TEXT,
  email_body TEXT,
  sent_at TEXT,
  followed_up_at TEXT,
  replied_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

WITH ranked AS (
  SELECT
    r.*,
    ROW_NUMBER() OVER (
      PARTITION BY r.job_id
      ORDER BY r.updated_at DESC, r.created_at DESC, r.id DESC
    ) AS rn
  FROM outreach_records r
)
INSERT INTO outreach_records_new (
  id,
  user_id,
  job_id,
  status,
  email_subject,
  email_body,
  sent_at,
  followed_up_at,
  replied_at,
  notes,
  created_at,
  updated_at
)
SELECT
  id,
  COALESCE((SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 'legacy-user'),
  job_id,
  status,
  email_subject,
  email_body,
  sent_at,
  followed_up_at,
  replied_at,
  notes,
  created_at,
  updated_at
FROM ranked
WHERE rn = 1;

DROP TABLE outreach_records;
ALTER TABLE outreach_records_new RENAME TO outreach_records;

-- Plan table.
CREATE TABLE IF NOT EXISTS user_plan (
  user_id TEXT PRIMARY KEY NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_started_at TEXT NOT NULL,
  plan_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO user_plan (
  user_id,
  plan,
  plan_started_at,
  plan_expires_at,
  created_at,
  updated_at
)
SELECT
  id,
  'free',
  datetime('now'),
  NULL,
  datetime('now'),
  datetime('now')
FROM users;

-- Monthly usage counters.
CREATE TABLE IF NOT EXISTS usage_counters (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  reveals_used INTEGER NOT NULL DEFAULT 0,
  drafts_used INTEGER NOT NULL DEFAULT 0,
  sends_used INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, period_start),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Revealed contacts per user/job.
CREATE TABLE IF NOT EXISTS job_reveals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Per-user job match scores.
CREATE TABLE IF NOT EXISTS job_match_scores (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  score REAL NOT NULL,
  calculated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Seed per-user scores from legacy global jobs.match_score.
INSERT OR IGNORE INTO job_match_scores (id, user_id, job_id, score, calculated_at)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  j.id,
  j.match_score,
  COALESCE(j.match_score_calculated_at, datetime('now'))
FROM users u
JOIN jobs j ON j.match_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_user_id ON outreach_records(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_user_status ON outreach_records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_usage_user_period ON usage_counters(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_job_reveals_user_job ON job_reveals(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_job_match_scores_user_job ON job_match_scores(user_id, job_id);

PRAGMA foreign_keys=ON;
