package org.example.finfast.expenseservice.category

import org.example.finfast.expenseservice.AuthenticationRequiredException
import org.example.finfast.expenseservice.InvalidCategoryException
import org.example.finfast.expenseservice.userdatachange.UserDataChangeService
import org.example.finfast.expenseservice.userdatachange.UserDataType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class CategoryService(
    private val customRepository: CustomUserCategoryRepository,
    private val hiddenRepository: UserHiddenSystemCategoryRepository,
    private val userDataChangeService: UserDataChangeService
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
        val system = SystemCategory.entries.map {
            CategoryDto(
                it.id,
                it.displayName,
                it.icon,
                it.color,
                true,
                it.id in hidden
            )
        }
        val custom = customRepository.findAllByUserIdOrderByCreatedAtAsc(userId).map {
            CategoryDto(it.id.toString(), it.name, it.icon, it.color, false, deleted = it.deletedAt != null)
        }
        return system + custom
    }

    @Transactional
    fun create(input: CategoryInputDto): CustomCategoryDto {
        validateInput(input)
        val currentUserId = currentUserId()
        val category = CustomUserCategory(
            input.id ?: UUID.randomUUID(),
            currentUserId,
            input.name.trim(),
            input.icon,
            input.color,
            Instant.now()
        )

        val createdCategory = customRepository.save(category)
        saveCategoriesChangeTimestamp(currentUserId)
        return category.toDto(createdCategory)
    }

    @Transactional
    fun update(id: UUID, input: CategoryInputDto): CustomCategoryDto {
        validateInput(input)
        val currentUserId = currentUserId()
        val category = ownedCategory(currentUserId, id)
        if (category.deletedAt != null) throw InvalidCategoryException("Deleted category cannot be edited")
        category.name = input.name.trim()
        category.icon = input.icon
        category.color = input.color
        val updatedCategory = customRepository.save(category)
        saveCategoriesChangeTimestamp(currentUserId)
        return category.toDto(updatedCategory)
    }

    @Transactional
    fun delete(id: UUID) {
        val currentUserId = currentUserId()
        val category = ownedCategory(currentUserId, id)
        category.deletedAt = Instant.now()
        customRepository.save(category)
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun restore(id: UUID) {
        val currentUserId = currentUserId()
        val category = ownedCategory(currentUserId, id)
        category.deletedAt = null
        customRepository.save(category)
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun hideSystem(id: String) {
        requireValidSystem(id)
        val currentUserId = currentUserId()
        hiddenRepository.save(UserHiddenSystemCategory(UserHiddenSystemCategoryId(currentUserId, id)))
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun restoreSystem(id: String) {
        requireValidSystem(id)
        val currentUserId = currentUserId()
        hiddenRepository.deleteById(UserHiddenSystemCategoryId(currentUserId, id))
        saveCategoriesChangeTimestamp(currentUserId)
    }

    private fun ownedCategory(userId: UUID, id: UUID): CustomUserCategory =
        customRepository.findByIdAndUserId(id, userId) ?: throw InvalidCategoryException("Category is not owned by the user")

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

    private fun saveCategoriesChangeTimestamp(userId: UUID) {
        userDataChangeService.saveTimestamp(userId, UserDataType.CATEGORY)
    }
}

private fun CustomUserCategory.toDto(category: CustomUserCategory) = CustomCategoryDto(
    category.id, category.name, category.icon, category.color, category.createdAt, category.deletedAt
)