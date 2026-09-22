package org.example.finfast.expenseservice.category

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface UserHiddenSystemCategoryRepository : JpaRepository<UserHiddenSystemCategory, UserHiddenSystemCategoryId> {
    fun findAllByIdUserId(userId: UUID): List<UserHiddenSystemCategory>
}