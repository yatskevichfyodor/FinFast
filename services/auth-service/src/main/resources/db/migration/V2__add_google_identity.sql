ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users ADD COLUMN google_subject VARCHAR(255);
ALTER TABLE users ADD COLUMN google_email VARCHAR(320);

ALTER TABLE users ADD CONSTRAINT uk_users_google_subject UNIQUE (google_subject);
