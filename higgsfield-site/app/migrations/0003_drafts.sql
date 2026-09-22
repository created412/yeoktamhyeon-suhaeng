CREATE TABLE IF NOT EXISTS drafts (
  task TEXT NOT NULL,
  device_id TEXT NOT NULL,
  student_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (task, device_id)
);
