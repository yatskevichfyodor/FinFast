package org.example.finfast.expenseservice.category

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface CustomCategoryRepository : JpaRepository<CustomCategory, UUID> {
    fun findAllByUserIdOrderByCreatedAtAsc(userId: UUID): List<CustomCategory>
    fun findAllByUserIdAndHiddenAtIsNullOrderByCreatedAtAsc(userId: UUID): List<CustomCategory>
    fun findByIdAndUserId(id: UUID, userId: UUID): CustomCategory?
    fun existsByIdAndUserIdAndHiddenAtIsNull(id: UUID, userId: UUID): Boolean
}