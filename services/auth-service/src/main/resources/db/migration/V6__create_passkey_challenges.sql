CREATE TABLE passkey_challenges
(
    id         UUID PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_passkey_challenges_expires_at
    ON passkey_challenges (expires_at);