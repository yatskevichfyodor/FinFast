package org.example.finfast.expense

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Embeddable
data class ExpenseId(
    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,
    @Column(name = "id", nullable = false, updatable = false)
    val expenseId: UUID
)

@Entity
@Table(name = "expenses")
class Expense(

    @EmbeddedId
    val expenseId: ExpenseId,

    @Column(nullable = false, precision = 19, scale = 2)
    var amount: BigDecimal,

    @Column(name = "category")
    var categoryId: String? = null,

    @Column(nullable = false, updatable = false)
    val createdAt: Instant
) {
    val id: UUID
        get() = expenseId.expenseId

    val userId: UUID
        get() = expenseId.userId
}