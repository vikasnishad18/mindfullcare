-- Run this on an existing DB created before 2026-02-24.

ALTER TABLE users
  ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS experts (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  specialization VARCHAR(190) NOT NULL,
  experience INT NOT NULL DEFAULT 0,
  image VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Optional: promote a user to admin (edit email first)
-- UPDATE users SET role='admin' WHERE email='admin@example.com';

