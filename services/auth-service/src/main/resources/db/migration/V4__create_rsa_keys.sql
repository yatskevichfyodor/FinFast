CREATE TABLE rsa_keys (
    id UUID PRIMARY KEY,
    key_id VARCHAR(100) NOT NULL UNIQUE,
    private_key TEXT NOT NULL,
    public_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    deactivated_at TIMESTAMP
);

CREATE INDEX idx_rsa_keys_key_id ON rsa_keys(key_id);
CREATE INDEX idx_rsa_keys_is_active ON rsa_keys(is_active);
CREATE INDEX idx_rsa_keys_deactivated_at ON rsa_keys(deactivated_at);
