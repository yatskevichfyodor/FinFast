package org.example.finfast.expenseservice

class ExpenseNotFoundException(id: Any) : RuntimeException("Expense not found: $id")

class AuthenticationRequiredException : RuntimeException("Authenticated user is required")

class InvalidCategoryException(message: String) : RuntimeException(message)