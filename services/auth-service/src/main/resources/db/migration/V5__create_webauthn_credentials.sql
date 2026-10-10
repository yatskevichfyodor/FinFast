CREATE TABLE webauthn_credentials
(
    id                   UUID PRIMARY KEY,
    user_id              UUID         NOT NULL,
    credential_id        VARCHAR(255) NOT NULL,
    public_key           BYTEA        NOT NULL,
    public_key_algorithm BIGINT       NOT NULL,
    counter              BIGINT       NOT NULL DEFAULT 0,
    aaguid               UUID         NOT NULL,

    CONSTRAINT uk_webauthn_credentials_credential_id
        UNIQUE (credential_id),

    CONSTRAINT fk_webauthn_credentials_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
);

