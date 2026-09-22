ALTER TABLE expenses ADD COLUMN deleted_at timestamp with time zone;

CREATE INDEX idx_expenses_user_deleted_at ON expenses (user_id, deleted_at);
