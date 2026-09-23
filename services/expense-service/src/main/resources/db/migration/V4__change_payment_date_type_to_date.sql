ALTER TABLE expenses
ALTER COLUMN payment_date TYPE DATE
    USING (payment_date AT TIME ZONE 'UTC')::date;
