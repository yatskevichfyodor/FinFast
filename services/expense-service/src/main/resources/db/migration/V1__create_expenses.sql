CREATE TABLE expenses (
    id UUID NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    category VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_expenses PRIMARY KEY (id)
);
