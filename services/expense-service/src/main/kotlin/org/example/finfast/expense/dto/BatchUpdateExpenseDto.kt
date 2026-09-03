package org.example.finfast.expense.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.*

class BatchUpdateExpenseDto(
    val id: UUID,
    val amount: BigDecimal?,
    val categoryId: String?,
    val description: String?,
    val paymentDate: Instant?
)

fun BatchUpdateExpenseDto.toUpdateDto() =
    UpdateExpenseDto(
        amount = amount,
        categoryId = categoryId,
        description = description,
        paymentDate = paymentDate
    )