package org.example.finfast.expenseservice.expense

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
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

    @Column(name = "custom_category_id")
    var customCategoryId: UUID? = null,

    @Column(nullable = false, updatable = false)
    val createdAt: Instant,

    @Column
    var description: String? = null,

    @Column(name = "payment_date")
    var paymentDate: LocalDate? = null,

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null
) {
    val id: UUID
        get() = expenseId.expenseId

    val userId: UUID
        get() = expenseId.userId
}