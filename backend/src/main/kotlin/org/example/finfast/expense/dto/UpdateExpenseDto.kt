package org.example.finfast.expense.dto

import org.example.finfast.entity.Expense
import java.math.BigDecimal

data class UpdateExpenseDto(
    val amount: BigDecimal?,
    val categoryId: String?
)

fun Expense.toUpdateDto() =
    UpdateExpenseDto(
        amount = amount,
        categoryId = categoryId
    )