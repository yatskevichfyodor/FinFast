ALTER TABLE expenses ADD COLUMN user_id UUID;

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
