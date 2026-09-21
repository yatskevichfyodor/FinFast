package org.example.finfast.expense

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.io.Serializable
import java.util.UUID

@Embeddable
data class UserHiddenSystemCategoryId(
    @Column(name = "user_id") val userId: UUID,
    @Column(name = "category_id") val categoryId: String
) : Serializable

@Entity
@Table(name = "user_hidden_system_categories")
class UserHiddenSystemCategory(
    @EmbeddedId val id: UserHiddenSystemCategoryId
)