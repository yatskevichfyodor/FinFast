package org.example.finfast.expenseservice.category

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "custom_user_categories")
class CustomUserCategory(
    @Id
    val id: UUID,
    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,
    @Column(nullable = false)
    var name: String,
    @Column(nullable = false)
    var icon: String,
    @Column(nullable = false)
    var color: String,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
    @Column(name = "deleted_at")
    var deletedAt: Instant? = null
)