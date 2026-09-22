package org.example.finfast.expenseservice.expense.dto

import org.example.finfast.expenseservice.expense.Expense
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class ExpenseDto(
    val id: UUID,
    val amount: BigDecimal,
    val categoryId: String?,
    val customCategoryId: UUID?,
    val createdAt: Instant,
    val description: String?,
    val paymentDate: Instant?,
    val deletedAt: Instant? = null
)

fun Expense.toDto() =
    ExpenseDto(
        id = id,
        amount = amount,
        categoryId = categoryId,
        customCategoryId = customCategoryId,
        createdAt = createdAt,
        description = description,
        paymentDate = paymentDate,
        deletedAt = deletedAt
    )