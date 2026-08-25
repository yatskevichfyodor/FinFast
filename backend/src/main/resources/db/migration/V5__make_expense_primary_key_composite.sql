ALTER TABLE expenses
    DROP PRIMARY KEY;

ALTER TABLE expenses
    ADD CONSTRAINT pk_expenses PRIMARY KEY (user_id, id);
