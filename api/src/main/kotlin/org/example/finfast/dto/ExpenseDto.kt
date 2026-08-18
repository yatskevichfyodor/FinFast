package org.example.org.example.finfast.dto

import org.example.org.example.finfast.entity.Expense
import java.math.BigDecimal
import java.util.UUID

data class ExpenseDto(
    val id: UUID,
    val amount: BigDecimal?,
    val categoryId: String?
)

fun Expense.toDto() =
    ExpenseDto(
        id = id,
        amount = amount,
        categoryId = categoryId
    )