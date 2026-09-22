package org.example.finfast.expenseservice.expense.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.*

class BatchUpdateExpenseDto(
    val id: UUID,
    val amount: BigDecimal?,
    val categoryId: String?,
    val customCategoryId: UUID?,
    /** Explicitly removes both system and custom category assignments. */
    val clearCategory: Boolean = false,
    val description: String?,
    val paymentDate: Instant?
)

fun BatchUpdateExpenseDto.toUpdateDto() =
    UpdateExpenseDto(
        amount = amount,
        categoryId = categoryId,
        customCategoryId = customCategoryId,
        clearCategory = clearCategory,
        description = description,
        paymentDate = paymentDate
    )