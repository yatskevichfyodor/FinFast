package org.example.finfast.expense.dto

import com.fasterxml.jackson.annotation.JsonProperty
import java.util.UUID

data class SyncExpensesDto(
    @JsonProperty("create")
    val create: List<ExpenseDto> = emptyList(),
    @JsonProperty("update")
    val update: List<BatchUpdateExpenseDto> = emptyList(),
    @JsonProperty("delete")
    val delete: List<UUID> = emptyList()
)
