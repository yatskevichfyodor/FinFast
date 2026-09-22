package org.example.finfast.expenseservice.category

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface CustomUserCategoryRepository : JpaRepository<CustomUserCategory, UUID> {
    fun findAllByUserIdOrderByCreatedAtAsc(userId: UUID): List<CustomUserCategory>
    fun findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtAsc(userId: UUID): List<CustomUserCategory>
    fun findByIdAndUserId(id: UUID, userId: UUID): CustomUserCategory?
    fun existsByIdAndUserIdAndDeletedAtIsNull(id: UUID, userId: UUID): Boolean
}