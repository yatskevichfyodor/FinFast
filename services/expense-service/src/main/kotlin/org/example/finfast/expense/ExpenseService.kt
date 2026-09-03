package org.example.finfast.expense

import org.example.finfast.expense.dto.BatchUpdateExpenseDto
import org.example.finfast.expense.dto.ExpenseDto
import org.example.finfast.expense.dto.SyncExpensesDto
import org.example.finfast.expense.dto.UpdateExpenseDto
import org.example.finfast.expense.dto.toDto
import org.example.finfast.expense.dto.toUpdateDto
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.security.core.context.SecurityContextHolder
import java.util.UUID

@Service
class ExpenseService(
    private val expenseRepository: ExpenseRepository
) {

    @Transactional(readOnly = true)
    fun get(id: UUID): ExpenseDto {
        val expense = expenseRepository.findById(ExpenseId(currentUserId(), id))
            .orElseThrow { RuntimeException("Expense not found: $id") }

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
        val expense = Expense(
            expenseId = ExpenseId(userId, dto.id),
            amount = dto.amount,
            categoryId = dto.categoryId,
            createdAt = dto.createdAt,
            description = dto.description,
            paymentDate = dto.paymentDate
        )

        expenseRepository.save(expense)
    }

    @Transactional
    fun createBatch(dtos: List<ExpenseDto>) {
        val userId = currentUserId()
        val expenses = dtos.map { dto ->
            Expense(
                expenseId = ExpenseId(userId, dto.id),
                amount = dto.amount,
                categoryId = dto.categoryId,
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
        val expense = expenseRepository.findById(ExpenseId(currentUserId(), id))
            .orElseThrow { RuntimeException("Expense not found: $id") }

        updateExpense(expense, dto)

        expenseRepository.save(expense)
    }

    @Transactional
    fun updateBatch(dtos: List<BatchUpdateExpenseDto>) {
        val userId = currentUserId()
        val expenses = dtos.map { batchUpdateDto ->
            val expense = expenseRepository.findById(ExpenseId(userId, batchUpdateDto.id))
                .orElseThrow { RuntimeException("Expense not found: ${batchUpdateDto.id}") }

            updateExpense(expense, batchUpdateDto.toUpdateDto())

            expense
        }

        expenseRepository.saveAll(expenses)
    }

    @Transactional
    fun delete(id: UUID): Boolean {
        val expenseId = ExpenseId(currentUserId(), id)
        if (!expenseRepository.existsById(expenseId)) {
            return false
        }

        expenseRepository.deleteById(expenseId)
        return true
    }

    @Transactional
    fun deleteBatch(ids: List<UUID>) {
        val userId = currentUserId()
        expenseRepository.deleteAllById(ids.map { ExpenseId(userId, it) })
    }

    private fun updateExpense(
        expense: Expense,
        dto: UpdateExpenseDto
    ) {
        dto.amount?.let {
            expense.amount = it
        }

        dto.categoryId?.let {
            expense.categoryId = it
        }

        dto.description?.let {
            expense.description = it
        }

        dto.paymentDate?.let {
            expense.paymentDate = it
        }
    }

    private fun currentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
            ?.takeIf { it.isAuthenticated }
            ?: throw IllegalStateException("Authenticated user is required")
        return UUID.fromString(authentication.name)
    }
}