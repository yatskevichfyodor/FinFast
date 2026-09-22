package org.example.finfast.expenseservice.dto

import org.example.finfast.expenseservice.Expense
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class UpdateExpenseDto(
    val amount: BigDecimal?,
    val categoryId: String?,
    val customCategoryId: UUID?,
    /** Explicitly removes both system and custom category assignments. */
    val clearCategory: Boolean = false,
    val description: String?,
    val paymentDate: Instant?
)

fun Expense.toUpdateDto() =
    UpdateExpenseDto(
        amount = amount,
        categoryId = categoryId,
        customCategoryId = customCategoryId,
        clearCategory = false,
        description = description,
        paymentDate = paymentDate
    )