package org.example.finfast.service

import org.example.finfast.expense.dto.BatchUpdateExpenseDto
import org.example.finfast.expense.dto.ExpenseDto
import org.example.finfast.expense.dto.SyncExpensesDto
import org.example.finfast.expense.dto.UpdateExpenseDto
import org.example.finfast.expense.dto.toDto
import org.example.finfast.expense.dto.toUpdateDto
import org.example.finfast.entity.Expense
import org.example.finfast.repository.ExpenseRepository
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
        val expense = expenseRepository.findByIdAndUserId(id, currentUserId())
            ?: throw RuntimeException("Expense not found: $id")

        return expense.toDto()
    }

    @Transactional(readOnly = true)
    fun getByIds(ids: List<UUID>): List<ExpenseDto> {
        return expenseRepository.findAllByIdInAndUserId(ids, currentUserId())
            .map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun getAll(): List<ExpenseDto> {
        return expenseRepository.findAllByUserIdOrderByCreatedAtDesc(currentUserId())
            .map { it.toDto() }
    }

    @Transactional
    fun create(dto: ExpenseDto) {
        val expense = Expense(
            id = dto.id,
            amount = dto.amount,
            categoryId = dto.categoryId,
            createdAt = dto.createdAt,
            userId = currentUserId()
        )

        expenseRepository.save(expense)
    }

    @Transactional
    fun createBatch(dtos: List<ExpenseDto>) {
        val expenses = dtos.map { dto ->
            Expense(
                id = dto.id,
                amount = dto.amount,
                categoryId = dto.categoryId,
                createdAt = dto.createdAt,
                userId = currentUserId()
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
        val expense = expenseRepository.findByIdAndUserId(id, currentUserId())
            ?: throw RuntimeException("Expense not found: $id")

        updateExpense(expense, dto)

        expenseRepository.save(expense)
    }

    @Transactional
    fun updateBatch(dtos: List<BatchUpdateExpenseDto>) {
        val expenses = dtos.map { batchUpdateDto ->
            val expense = expenseRepository.findByIdAndUserId(batchUpdateDto.id, currentUserId())
                ?: throw RuntimeException("Expense not found: ${batchUpdateDto.id}")

            updateExpense(expense, batchUpdateDto.toUpdateDto())

            expense
        }

        expenseRepository.saveAll(expenses)
    }

    @Transactional
    fun delete(id: UUID): Boolean {
        if (!expenseRepository.existsByIdAndUserId(id, currentUserId())) {
            return false
        }

        expenseRepository.deleteByIdAndUserId(id, currentUserId())
        return true
    }

    @Transactional
    fun deleteBatch(ids: List<UUID>) {
        expenseRepository.deleteAllByIdInAndUserId(ids, currentUserId())
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
    }

    private fun currentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
            ?.takeIf { it.isAuthenticated }
            ?: throw IllegalStateException("Authenticated user is required")
        return UUID.fromString(authentication.name)
    }
}