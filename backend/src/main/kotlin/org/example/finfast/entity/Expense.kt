package org.example.finfast.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "expenses")
class Expense(

    @Id
    @Column(nullable = false, updatable = false)
    val id: UUID,

    @Column(nullable = false, precision = 19, scale = 2)
    var amount: BigDecimal,

    @Column(name = "category")
    var categoryId: String? = null,

    @Column(nullable = false, updatable = false)
    val createdAt: Instant,

    @Column(name = "user_id", nullable = false)
    val userId: UUID
)