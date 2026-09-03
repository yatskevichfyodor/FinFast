package org.example.finfast.expense.dto

import org.example.finfast.expense.Expense
import java.math.BigDecimal
import java.time.Instant

data class UpdateExpenseDto(
    val amount: BigDecimal?,
    val categoryId: String?,
    val description: String?,
    val paymentDate: Instant?
)

fun Expense.toUpdateDto() =
    UpdateExpenseDto(
        amount = amount,
        categoryId = categoryId,
        description = description,
        paymentDate = paymentDate
    )