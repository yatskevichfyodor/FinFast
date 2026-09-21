package org.example.finfast.expense

import java.time.Instant
import java.util.UUID

data class CustomCategoryDto(
    val id: UUID,
    val name: String,
    val icon: String,
    val color: String,
    val createdAt: Instant,
    val deletedAt: Instant?
)

data class CategoryInputDto(
    val id: UUID? = null,
    val name: String,
    val icon: String,
    val color: String
)

data class CategoryDto(
    val id: String,
    val name: String,
    val icon: String,
    val color: String,
    val system: Boolean,
    val hidden: Boolean = false,
    val deleted: Boolean = false
)