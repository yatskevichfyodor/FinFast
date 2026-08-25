package org.example.finfast.repository

import org.example.finfast.entity.Expense
import org.example.finfast.entity.ExpenseId
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ExpenseRepository : JpaRepository<Expense, ExpenseId> {
    fun findAllByExpenseId_UserIdOrderByCreatedAtDesc(userId: UUID): List<Expense>
}