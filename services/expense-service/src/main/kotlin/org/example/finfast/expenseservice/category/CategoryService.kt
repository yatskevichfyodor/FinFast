package org.example.finfast.expenseservice.category

import org.example.finfast.expenseservice.InvalidCategoryException
import org.example.finfast.expenseservice.expense.ExpenseRepository
import org.example.finfast.expenseservice.security.CurrentUser
import org.example.finfast.expenseservice.userdatachange.UserDataChangeService
import org.example.finfast.expenseservice.userdatachange.UserDataType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

@Service
class CategoryService(
    private val currentUser: CurrentUser,
    private val customRepository: CustomCategoryRepository,
    private val hiddenCategoryRepository: HiddenSystemCategoryRepository,
    private val expenseRepository: ExpenseRepository,
    private val userDataChangeService: UserDataChangeService
) {
    @Transactional(readOnly = true)
    fun getAllCategories(): CustomAndHiddenSystemCategoriesDto {
        return CustomAndHiddenSystemCategoriesDto(
            customCategories = getCustomCategories(),
            hiddenSystemCategoriesIds = getHiddenSystemCategories()
        )
    }

    @Transactional(readOnly = true)
    fun getCustomCategories(): List<CategoryDto> {
        return customRepository.findAllByUserIdOrderByCreatedAtAsc(currentUser.id())
            .map { CategoryDto(it.id.toString(), it.name, it.icon, it.color, false) }
    }

    @Transactional
    fun createCustomCategory(input: CategoryInputDto): CustomCategoryDto {
        validateInput(input)
        val currentUserId = currentUser.id()
        val category = CustomCategory(
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
    fun updateCustomCategory(id: UUID, input: CategoryInputDto): CustomCategoryDto {
        validateInput(input)
        val currentUserId = currentUser.id()
        val category = ownedCategory(currentUserId, id)
        if (category.hiddenAt != null) throw InvalidCategoryException("Hidden category cannot be edited")
        category.name = input.name.trim()
        category.icon = input.icon
        category.color = input.color
        val updatedCategory = customRepository.save(category)
        saveCategoriesChangeTimestamp(currentUserId)
        return category.toDto(updatedCategory)
    }

    @Transactional
    fun hideCustomCategory(id: UUID) {
        val currentUserId = currentUser.id()
        val category = ownedCategory(currentUserId, id)
        category.hiddenAt = Instant.now()
        customRepository.save(category)
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun deleteCustomCategory(id: UUID) {
        val currentUserId = currentUser.id()
        val category = ownedCategory(currentUserId, id)

        expenseRepository.findAllByCustomCategoryIdAndDeletedAtIsNull(id)
            .forEach { expense ->
                expense.customCategoryId = null
                expense.categoryId = null
            }

        customRepository.delete(category)
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun restoreCustomCategory(id: UUID) {
        val currentUserId = currentUser.id()
        val category = ownedCategory(currentUserId, id)
        category.hiddenAt = null
        customRepository.save(category)
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional(readOnly = true)
    fun getHiddenSystemCategories(): List<String> {
        return hiddenCategoryRepository.findAllByIdUserId(currentUser.id()).map { it.id.categoryId }
    }

    @Transactional
    fun hideSystemCategory(id: String) {
        requireValidSystem(id)
        val currentUserId = currentUser.id()
        hiddenCategoryRepository.save(UserHiddenSystemCategory(UserHiddenSystemCategoryId(currentUserId, id)))
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun restoreSystemCategory(id: String) {
        requireValidSystem(id)
        val currentUserId = currentUser.id()
        hiddenCategoryRepository.deleteById(UserHiddenSystemCategoryId(currentUserId, id))
        saveCategoriesChangeTimestamp(currentUserId)
    }

    @Transactional(readOnly = true)
    fun getNumberOfLinkedExpenses(categoryId: UUID): Long {
        val currentUserId = currentUser.id()
        ownedCategory(currentUserId, categoryId)
        return expenseRepository.countByCustomCategoryIdAndDeletedAtIsNull(categoryId)
    }

    private fun ownedCategory(userId: UUID, id: UUID): CustomCategory =
        customRepository.findByIdAndUserId(id, userId)
            ?: throw InvalidCategoryException("Category is not owned by the user")

    private fun validateInput(input: CategoryInputDto) {
        if (input.name.trim().isEmpty() || input.name.length > 100 || input.icon.isBlank() || input.color.isBlank()) {
            throw IllegalArgumentException("Invalid custom category")
        }
    }

    private fun requireValidSystem(id: String) {
        if (!SystemCategory.isValid(id)) throw InvalidCategoryException("Unknown system category: $id")
    }

    private fun saveCategoriesChangeTimestamp(userId: UUID) {
        userDataChangeService.saveTimestamp(userId, UserDataType.CATEGORY)
    }
}

private fun CustomCategory.toDto(category: CustomCategory) = CustomCategoryDto(
    category.id, category.name, category.icon, category.color, category.createdAt, category.hiddenAt
)