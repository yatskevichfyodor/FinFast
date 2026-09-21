package org.example.finfast.expense

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class CategoryService(
    private val customRepository: CustomUserCategoryRepository,
    private val hiddenRepository: UserHiddenSystemCategoryRepository
) {
    @Transactional(readOnly = true)
    fun getAvailable(): List<CategoryDto> {
        val userId = currentUserId()
        val hidden = hiddenRepository.findAllByIdUserId(userId).map { it.id.categoryId }.toSet()
        val system = SystemCategory.entries.filterNot { it.id in hidden }.map {
            CategoryDto(it.id, it.displayName, it.icon, it.color, true)
        }
        val custom = customRepository.findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtAsc(userId).map {
            CategoryDto(it.id.toString(), it.name, it.icon, it.color, false)
        }
        return system + custom
    }

    @Transactional(readOnly = true)
    fun getAllForEditor(): List<CategoryDto> {
        val userId = currentUserId()
        val hidden = hiddenRepository.findAllByIdUserId(userId).map { it.id.categoryId }.toSet()
        val system = SystemCategory.entries.map { CategoryDto(it.id, it.displayName, it.icon, it.color, true, it.id in hidden) }
        val custom = customRepository.findAllByUserIdOrderByCreatedAtAsc(userId).map {
            CategoryDto(it.id.toString(), it.name, it.icon, it.color, false, deleted = it.deletedAt != null)
        }
        return system + custom
    }

    @Transactional
    fun create(input: CategoryInputDto): CustomCategoryDto {
        validateInput(input)
        val category = CustomUserCategory(input.id ?: UUID.randomUUID(), currentUserId(), input.name.trim(), input.icon, input.color, Instant.now())
        return category.toDto(customRepository.save(category))
    }

    @Transactional
    fun update(id: UUID, input: CategoryInputDto): CustomCategoryDto {
        validateInput(input)
        val category = ownedCategory(id)
        if (category.deletedAt != null) throw InvalidCategoryException("Deleted category cannot be edited")
        category.name = input.name.trim()
        category.icon = input.icon
        category.color = input.color
        return category.toDto(customRepository.save(category))
    }

    @Transactional
    fun delete(id: UUID) {
        val category = ownedCategory(id)
        category.deletedAt = Instant.now()
        customRepository.save(category)
    }

    @Transactional
    fun restore(id: UUID) {
        val category = ownedCategory(id)
        category.deletedAt = null
        customRepository.save(category)
    }

    @Transactional
    fun hideSystem(id: String) {
        requireValidSystem(id)
        hiddenRepository.save(UserHiddenSystemCategory(UserHiddenSystemCategoryId(currentUserId(), id)))
    }

    @Transactional
    fun restoreSystem(id: String) {
        requireValidSystem(id)
        hiddenRepository.deleteById(UserHiddenSystemCategoryId(currentUserId(), id))
    }

    private fun ownedCategory(id: UUID): CustomUserCategory =
        customRepository.findByIdAndUserId(id, currentUserId()) ?: throw InvalidCategoryException("Category is not owned by the user")

    private fun validateInput(input: CategoryInputDto) {
        if (input.name.trim().isEmpty() || input.name.length > 100 || input.icon.isBlank() || input.color.isBlank()) {
            throw IllegalArgumentException("Invalid custom category")
        }
    }

    private fun requireValidSystem(id: String) {
        if (!SystemCategory.isValid(id)) throw InvalidCategoryException("Unknown system category: $id")
    }

    private fun currentUserId(): UUID = UUID.fromString(
        SecurityContextHolder.getContext().authentication?.takeIf { it.isAuthenticated }?.name
            ?: throw AuthenticationRequiredException()
    )
}

private fun CustomUserCategory.toDto(category: CustomUserCategory) = CustomCategoryDto(
    category.id, category.name, category.icon, category.color, category.createdAt, category.deletedAt
)