package org.example.org.example.finfast.service

import org.example.org.example.finfast.dto.BatchUpdateExpenseDto
import org.example.org.example.finfast.dto.ExpenseDto
import org.example.org.example.finfast.dto.SyncExpensesDto
import org.example.org.example.finfast.dto.UpdateExpenseDto
import org.example.org.example.finfast.dto.toDto
import org.example.org.example.finfast.dto.toUpdateDto
import org.example.org.example.finfast.entity.Expense
import org.example.org.example.finfast.repository.ExpenseRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ExpenseService(
    private val expenseRepository: ExpenseRepository
) {

    @Transactional(readOnly = true)
    fun get(id: UUID): ExpenseDto {
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found: $id") }

        return expense.toDto()
    }

    @Transactional(readOnly = true)
    fun getByIds(ids: List<UUID>): List<ExpenseDto> {
        return expenseRepository.findAllById(ids)
            .map { it.toDto() }
    }

    @Transactional
    fun create(dto: ExpenseDto) {
        val expense = Expense(
            id = dto.id,
            amount = dto.amount,
            categoryId = dto.categoryId,
            createdAt = dto.createdAt
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
                createdAt = dto.createdAt
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
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found: $id") }

        updateExpense(expense, dto)

        expenseRepository.save(expense)
    }

    @Transactional
    fun updateBatch(dtos: List<BatchUpdateExpenseDto>) {
        val expenses = dtos.map { batchUpdateDto ->
            val expense = expenseRepository.findById(batchUpdateDto.id)
                .orElseThrow {
                    RuntimeException("Expense not found: ${batchUpdateDto.id}")
                }

            updateExpense(expense, batchUpdateDto.toUpdateDto())

            expense
        }

        expenseRepository.saveAll(expenses)
    }

    @Transactional
    fun delete(id: UUID): Boolean {
        if (!expenseRepository.existsById(id)) {
            return false
        }

        expenseRepository.deleteById(id)
        return true
    }

    @Transactional
    fun deleteBatch(ids: List<UUID>) {
        expenseRepository.deleteAllById(ids)
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
}