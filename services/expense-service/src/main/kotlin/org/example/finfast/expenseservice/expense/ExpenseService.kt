package org.example.finfast.expenseservice.expense

import org.example.finfast.expenseservice.ExpenseNotFoundException
import org.example.finfast.expenseservice.InvalidCategoryException
import org.example.finfast.expenseservice.category.CustomCategoryRepository
import org.example.finfast.expenseservice.category.SystemCategory
import org.example.finfast.expenseservice.expense.dto.*
import org.example.finfast.expenseservice.security.CurrentUser
import org.example.finfast.expenseservice.userdatachange.UserDataChangeService
import org.example.finfast.expenseservice.userdatachange.UserDataType
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

@Service
class ExpenseService(
    private val currentUser: CurrentUser,
    private val expenseRepository: ExpenseRepository,
    private val customCategoryRepository: CustomCategoryRepository,
    private val userDataChangeService: UserDataChangeService
) {
    private val logger = LoggerFactory.getLogger(ExpenseService::class.java)

    @Transactional(readOnly = true)
    fun get(id: UUID): ExpenseDto {
        val expense = expenseRepository.findById(ExpenseId(currentUser.id(), id))
            .orElseThrow { ExpenseNotFoundException(id) }

        if (expense.deletedAt != null) {
            throw ExpenseNotFoundException(id)
        }

        return expense.toDto()
    }

    @Transactional(readOnly = true)
    fun getByIds(ids: List<UUID>): List<ExpenseDto> {
        val userId = currentUser.id()
        return expenseRepository.findAllById(ids.map { ExpenseId(userId, it) })
            .map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun getAll(): List<ExpenseDto> {
        return expenseRepository.findAllByExpenseId_UserIdOrderByCreatedAtDesc(currentUser.id())
            .map { it.toDto() }
    }

    @Transactional
    fun create(dto: ExpenseDto) {
        val currentUserId = currentUser.id()
        validateCategory(currentUserId, dto.categoryId, dto.customCategoryId)
        val expense = Expense(
            expenseId = ExpenseId(currentUserId, dto.id),
            amount = dto.amount,
            currency = validateCurrency(dto.currency),
            categoryId = dto.categoryId?.let(SystemCategory::normalize),
            customCategoryId = dto.customCategoryId,
            createdAt = dto.createdAt,
            description = dto.description,
            paymentDate = dto.paymentDate
        )

        expenseRepository.save(expense)
        saveExpensesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun update(
        id: UUID,
        dto: UpdateExpenseDto
    ) {
        val currentUserId = currentUser.id()
        val expense = activeExpense(currentUserId, id)

        updateExpense(expense, dto, currentUserId)

        expenseRepository.save(expense)
        saveExpensesChangeTimestamp(currentUserId)
    }

    @Transactional
    fun delete(id: UUID): Boolean {
        val currentUserId = currentUser.id()
        val expenseId = ExpenseId(currentUserId, id)
        val expense = expenseRepository.findById(expenseId).orElse(null) ?: return false

        if (expense.deletedAt != null) {
            return true
        }

        expense.deletedAt = Instant.now()
        expenseRepository.save(expense)
        saveExpensesChangeTimestamp(currentUserId)
        return true
    }

    @Transactional
    fun sync(dto: SyncExpensesDto) {
        val currentUserId = currentUser.id()
        deleteBatch(currentUserId, dto.delete)
        updateBatch(currentUserId, dto.update)
        createBatch(currentUserId, dto.create)
        saveExpensesChangeTimestamp(currentUserId)
    }

    private fun createBatch(userId: UUID, dtos: List<ExpenseDto>) {
        dtos.forEach { validateCategory(userId, it.categoryId, it.customCategoryId) }
        val expenses = dtos.map { dto ->
            Expense(
                expenseId = ExpenseId(userId, dto.id),
                amount = dto.amount,
                currency = validateCurrency(dto.currency),
                categoryId = dto.categoryId?.let(SystemCategory::normalize),
                customCategoryId = dto.customCategoryId,
                createdAt = dto.createdAt,
                description = dto.description,
                paymentDate = dto.paymentDate
            )
        }

        expenseRepository.saveAll(expenses)
    }

    private fun updateBatch(userId: UUID, dtos: List<BatchUpdateExpenseDto>) {
        val expenses = dtos.map { batchUpdateDto ->
            val expense = activeExpense(userId, batchUpdateDto.id)

            updateExpense(expense, batchUpdateDto.toUpdateDto(), userId)

            expense
        }

        expenseRepository.saveAll(expenses)
    }

    private fun deleteBatch(userId: UUID, expenseIds: List<UUID>) {
        val now = Instant.now()
        val expenses = expenseRepository.findAllById(expenseIds.map { ExpenseId(userId, it) })

        expenses.forEach { expense ->
            if (expense.deletedAt == null) {
                expense.deletedAt = now
            }
        }

        expenseRepository.saveAll(expenses)
    }

    private fun activeExpense(userId: UUID, id: UUID): Expense {
        val expense = expenseRepository.findById(ExpenseId(userId, id))
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

    @Transactional
    fun deleteExpensesForUser(userId: UUID) {
        logger.info("Deleting all expenses for user: $userId")
        val deletedCount = expenseRepository.deleteAllByExpenseId_UserId(userId)
        logger.info("Deleted $deletedCount expenses for user: $userId")
    }

    private fun updateExpense(
        expense: Expense,
        dto: UpdateExpenseDto,
        userId: UUID
    ) {
        dto.amount?.let {
            expense.amount = it
        }

        dto.currency?.let {
            expense.currency = validateCurrency(it)
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
            !customCategoryRepository.existsByIdAndUserIdAndHiddenAtIsNull(customCategoryId, userId)
        ) {
            throw InvalidCategoryException("Custom category is not available")
        }
    }

    private fun validateCurrency(currency: String): String {
        require(currency in setOf(
            "BYN", "RUB", "GEL", "USD", "EUR", "JPY", "GBP", "CHF", "CAD", "AUD",
            "NZD", "CNY", "INR", "KRW", "SGD", "HKD", "BRL", "MXN", "ZAR", "TRY",
            "PLN", "CZK", "HUF", "SEK", "NOK", "DKK", "TWD", "UAH", "KZT", "AMD",
            "AZN", "THB", "IDR", "MYR", "PHP", "VND", "ILS", "SAR", "AED", "QAR",
            "RON", "PEN", "MAD", "EGP", "NGN", "PKR", "BDT", "CLP", "ARS", "COP"
        )) {
            "Unsupported currency: $currency"
        }
        return currency
    }

    private fun saveExpensesChangeTimestamp(userId: UUID) {
        userDataChangeService.saveTimestamp(userId, UserDataType.EXPENSE)
    }
}
