package org.example.finfast.expenseservice.expense

import org.example.finfast.expenseservice.AuthenticationRequiredException
import org.example.finfast.expenseservice.category.CustomUserCategoryRepository
import org.example.finfast.expenseservice.ExpenseNotFoundException
import org.example.finfast.expenseservice.InvalidCategoryException
import org.example.finfast.expenseservice.category.SystemCategory
import org.example.finfast.expenseservice.expense.dto.BatchUpdateExpenseDto
import org.example.finfast.expenseservice.expense.dto.ExpenseDto
import org.example.finfast.expenseservice.expense.dto.SyncExpensesDto
import org.example.finfast.expenseservice.expense.dto.UpdateExpenseDto
import org.example.finfast.expenseservice.expense.dto.toDto
import org.example.finfast.expenseservice.expense.dto.toUpdateDto
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.security.core.context.SecurityContextHolder
import java.time.Instant
import java.util.UUID

@Service
class ExpenseService(
    private val expenseRepository: ExpenseRepository,
    private val customUserCategoryRepository: CustomUserCategoryRepository
) {

    @Transactional(readOnly = true)
    fun get(id: UUID): ExpenseDto {
        val expense = expenseRepository.findById(ExpenseId(currentUserId(), id))
            .orElseThrow { ExpenseNotFoundException(id) }

        if (expense.deletedAt != null) {
            throw ExpenseNotFoundException(id)
        }

        return expense.toDto()
    }

    @Transactional(readOnly = true)
    fun getByIds(ids: List<UUID>): List<ExpenseDto> {
        val userId = currentUserId()
        return expenseRepository.findAllById(ids.map { ExpenseId(userId, it) })
            .map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun getAll(): List<ExpenseDto> {
        return expenseRepository.findAllByExpenseId_UserIdOrderByCreatedAtDesc(currentUserId())
            .map { it.toDto() }
    }

    @Transactional
    fun create(dto: ExpenseDto) {
        val userId = currentUserId()
        validateCategory(userId, dto.categoryId, dto.customCategoryId)
        val expense = Expense(
            expenseId = ExpenseId(userId, dto.id),
            amount = dto.amount,
            categoryId = dto.categoryId?.let(SystemCategory::normalize),
            customCategoryId = dto.customCategoryId,
            createdAt = dto.createdAt,
            description = dto.description,
            paymentDate = dto.paymentDate
        )

        expenseRepository.save(expense)
    }

    @Transactional
    fun createBatch(dtos: List<ExpenseDto>) {
        val userId = currentUserId()
        dtos.forEach { validateCategory(userId, it.categoryId, it.customCategoryId) }
        val expenses = dtos.map { dto ->
            Expense(
                expenseId = ExpenseId(userId, dto.id),
                amount = dto.amount,
                categoryId = dto.categoryId?.let(SystemCategory::normalize),
                customCategoryId = dto.customCategoryId,
                createdAt = dto.createdAt,
                description = dto.description,
                paymentDate = dto.paymentDate
            )
        }

        expenseRepository.saveAll(expenses)
    }

    @Transactional
    fun sync(dto: SyncExpensesDto) {
        deleteBatch(dto.delete)
        updateBatch(dto.update)
        createBatch(dto.create)
    }

    @Transactional
    fun update(
        id: UUID,
        dto: UpdateExpenseDto
    ) {
        val expense = activeExpense(id)

        updateExpense(expense, dto, currentUserId())

        expenseRepository.save(expense)
    }

    @Transactional
    fun updateBatch(dtos: List<BatchUpdateExpenseDto>) {
        val userId = currentUserId()
        val expenses = dtos.map { batchUpdateDto ->
            val expense = activeExpense(batchUpdateDto.id)

            updateExpense(expense, batchUpdateDto.toUpdateDto(), userId)

            expense
        }

        expenseRepository.saveAll(expenses)
    }

    @Transactional
    fun delete(id: UUID): Boolean {
        val expenseId = ExpenseId(currentUserId(), id)
        val expense = expenseRepository.findById(expenseId).orElse(null) ?: return false

        if (expense.deletedAt != null) {
            return true
        }

        expense.deletedAt = Instant.now()
        expenseRepository.save(expense)
        return true
    }

    @Transactional
    fun deleteBatch(ids: List<UUID>) {
        val userId = currentUserId()
        val now = Instant.now()
        val expenses = expenseRepository.findAllById(ids.map { ExpenseId(userId, it) })

        expenses.forEach { expense ->
            if (expense.deletedAt == null) {
                expense.deletedAt = now
            }
        }

        expenseRepository.saveAll(expenses)
    }

    @Transactional
    fun deleteAllForCurrentUser() {
        expenseRepository.deleteAllByExpenseId_UserId(currentUserId())
    }

    private fun activeExpense(id: UUID): Expense {
        val expense = expenseRepository.findById(ExpenseId(currentUserId(), id))
            .orElseThrow { ExpenseNotFoundException(id) }

        if (expense.deletedAt != null) {
            throw ExpenseNotFoundException(id)
        }

        return expense
    }

    @Transactional
    fun purgeExpiredDeleted(before: Instant): Int {
        return expenseRepository.deleteAllByDeletedAtBefore(before)
    }

    private fun updateExpense(
        expense: Expense,
        dto: UpdateExpenseDto,
        userId: UUID
    ) {
        dto.amount?.let {
            expense.amount = it
        }

        if (dto.clearCategory) {
            expense.categoryId = null
            expense.customCategoryId = null
        } else if (dto.customCategoryId != null || dto.categoryId != null) {
            validateCategory(userId, dto.categoryId, dto.customCategoryId)
            expense.categoryId = dto.categoryId?.let(SystemCategory::normalize)
            expense.customCategoryId = dto.customCategoryId
        }

        dto.description?.let {
            expense.description = it
        }

        dto.paymentDate?.let {
            expense.paymentDate = it
        }
    }

    private fun validateCategory(userId: UUID, categoryId: String?, customCategoryId: UUID?) {
        if (categoryId != null && !SystemCategory.isValid(categoryId)) {
            throw InvalidCategoryException("Unknown system category: $categoryId")
        }

        if (customCategoryId != null &&
            !customUserCategoryRepository.existsByIdAndUserIdAndDeletedAtIsNull(customCategoryId, userId)
        ) {
            throw InvalidCategoryException("Custom category is not available")
        }
    }

    private fun currentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
            ?.takeIf { it.isAuthenticated }
            ?: throw AuthenticationRequiredException()
        return UUID.fromString(authentication.name)
    }
}
