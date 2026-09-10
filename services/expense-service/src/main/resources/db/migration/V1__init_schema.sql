CREATE TABLE expenses (
    id uuid NOT NULL,
    amount numeric(19,2) NOT NULL,
    category character varying(255),
    created_at timestamp with time zone NOT NULL,
    user_id uuid NOT NULL,
    description text,
    payment_date timestamp with time zone
);
