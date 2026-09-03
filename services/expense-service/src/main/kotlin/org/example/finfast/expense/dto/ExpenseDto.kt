package org.example.finfast.expense.dto

import org.example.finfast.expense.Expense
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class ExpenseDto(
    val id: UUID,
    val amount: BigDecimal,
    val categoryId: String?,
    val createdAt: Instant,
    val description: String?,
    val paymentDate: Instant?
)

fun Expense.toDto() =
    ExpenseDto(
        id = id,
        amount = amount,
        categoryId = categoryId,
        createdAt = createdAt,
        description = description,
        paymentDate = paymentDate
    )