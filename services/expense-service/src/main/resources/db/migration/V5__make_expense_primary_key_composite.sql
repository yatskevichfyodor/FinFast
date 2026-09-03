ALTER TABLE expenses
DROP CONSTRAINT pk_expenses;

ALTER TABLE expenses
    ADD CONSTRAINT pk_expenses PRIMARY KEY (user_id, id);