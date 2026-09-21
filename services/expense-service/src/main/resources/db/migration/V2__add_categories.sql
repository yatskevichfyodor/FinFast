CREATE TABLE custom_user_categories (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    name varchar(100) NOT NULL,
    icon varchar(100) NOT NULL,
    color varchar(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);

CREATE INDEX custom_user_categories_user_id_idx
    ON custom_user_categories (user_id);

ALTER TABLE expenses ADD COLUMN custom_category_id uuid;

CREATE TABLE user_hidden_system_categories (
    user_id uuid NOT NULL,
    category_id varchar(50) NOT NULL,
    PRIMARY KEY (user_id, category_id)
);