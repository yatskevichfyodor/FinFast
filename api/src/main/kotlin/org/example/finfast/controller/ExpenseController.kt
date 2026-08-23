package org.example.org.example.finfast.controller

import org.example.org.example.finfast.dto.CreateExpenseDto
import org.example.org.example.finfast.dto.UpdateExpenseDto
import org.example.org.example.finfast.dto.toCreateDto
import org.example.org.example.finfast.entity.Expense
import org.example.org.example.finfast.repository.ExpenseRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/expenses")
class ExpenseController(
    private val expenseRepository: ExpenseRepository
) {
    @GetMapping("/{id}")
    fun get(
        @PathVariable id: UUID
    ): ResponseEntity<CreateExpenseDto> {
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found") }

        return ResponseEntity.ok(expense.toCreateDto())
    }

    @GetMapping
    fun getByIds(
        @RequestParam ids: List<UUID>
    ): ResponseEntity<List<CreateExpenseDto>> {
        val expenses = expenseRepository.findAllById(ids)

        return ResponseEntity.ok(
            expenses.map { it.toCreateDto() }
        )
    }

    @PostMapping
    fun create(
        @RequestBody createExpenseDto: CreateExpenseDto
    ): ResponseEntity<Void> {
        val expense = Expense(
            id = createExpenseDto.id,
            amount = createExpenseDto.amount!!,
            categoryId = createExpenseDto.categoryId,
            createdAt = createExpenseDto.createdAt,
        )

        expenseRepository.save(expense)

        return ResponseEntity.status(201).build()
    }

    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody updateExpenseDto: UpdateExpenseDto
    ): ResponseEntity<Void> {
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found") }

        updateExpenseDto.amount?.let {
            expense.amount = it
        }
        updateExpenseDto.categoryId?.let {
            expense.categoryId = it
        }

        expenseRepository.save(expense)

        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: UUID
    ): ResponseEntity<Void> {

        if (!expenseRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }

        expenseRepository.deleteById(id)

        return ResponseEntity.noContent().build()
    }
}