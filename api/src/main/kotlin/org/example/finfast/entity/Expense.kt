package org.example.org.example.finfast.entity

import jakarta.persistence.*
import java.math.BigDecimal
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
    var categoryId: String? = null
)