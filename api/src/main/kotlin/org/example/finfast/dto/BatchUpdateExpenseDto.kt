package org.example.org.example.finfast.dto

import java.math.BigDecimal
import java.util.*

class BatchUpdateExpenseDto(
    val id: UUID,
    val amount: BigDecimal?,
    val categoryId: String?
)

fun BatchUpdateExpenseDto.toUpdateDto() =
    UpdateExpenseDto(
        amount = amount,
        categoryId = categoryId
    )