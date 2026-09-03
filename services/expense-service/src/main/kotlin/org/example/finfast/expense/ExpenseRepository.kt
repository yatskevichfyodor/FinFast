package org.example.finfast.expense

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ExpenseRepository : JpaRepository<Expense, ExpenseId> {
    fun findAllByExpenseId_UserIdOrderByCreatedAtDesc(userId: UUID): List<Expense>
}