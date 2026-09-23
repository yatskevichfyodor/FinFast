package org.example.finfast.expenseservice.expense

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.*

interface ExpenseRepository : JpaRepository<Expense, ExpenseId> {

    fun findAllByExpenseId_UserIdOrderByCreatedAtDesc(userId: UUID): List<Expense>

    fun deleteAllByExpenseId_UserId(userId: UUID): Long

    @Modifying
    @Query("DELETE FROM Expense e WHERE e.deletedAt IS NOT NULL AND e.deletedAt < :before")
    fun deleteAllByDeletedAtBefore(before: Instant): Int
}
