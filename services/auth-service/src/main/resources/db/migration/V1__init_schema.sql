CREATE TABLE users (
    id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_username UNIQUE (username)
);

CREATE TABLE refresh_tokens (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
