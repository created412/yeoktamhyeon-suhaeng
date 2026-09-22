CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  class_no INTEGER,
  number_no INTEGER,
  fields_json TEXT NOT NULL,
  first_at TEXT NOT NULL,
  last_at TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(task, student_id)
);
CREATE TABLE IF NOT EXISTS submission_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
