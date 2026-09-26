CREATE TABLE user_data_changes
(
    user_id    UUID        NOT NULL,
    data_type  VARCHAR(20) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT pk_user_data_changes
        PRIMARY KEY (user_id, data_type),

    CONSTRAINT chk_user_data_changes_data_type
        CHECK (data_type IN ('EXPENSE', 'CATEGORY'))
);