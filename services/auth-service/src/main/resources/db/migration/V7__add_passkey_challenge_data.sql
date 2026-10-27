DELETE FROM passkey_challenges;

ALTER TABLE passkey_challenges
    ADD COLUMN challenge VARCHAR(128),
    ADD COLUMN purpose VARCHAR(16),
    ADD COLUMN subject VARCHAR(100),
    ADD COLUMN username VARCHAR(100);

ALTER TABLE passkey_challenges
    ALTER COLUMN challenge SET NOT NULL,
    ALTER COLUMN purpose SET NOT NULL,
    ALTER COLUMN subject SET NOT NULL;