package org.example.org.example.finfast.dto

import org.example.org.example.finfast.entity.Expense
import java.math.BigDecimal
import java.util.UUID

data class CreateExpenseDto(
    val id: UUID,
    val amount: BigDecimal?,
    val categoryId: String?
)

fun Expense.toCreateDto() =
    CreateExpenseDto(
        id = id,
        amount = amount,
        categoryId = categoryId
    )