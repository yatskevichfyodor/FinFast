package org.example.org.example.finfast.controller

import org.example.org.example.finfast.dto.ExpenseDto
import org.example.org.example.finfast.dto.toDto
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
    @PostMapping
    fun create(
        @RequestBody expenseDto: ExpenseDto
    ): ResponseEntity<Void> {
        val expense = Expense(
            id = expenseDto.id,
            amount = expenseDto.amount!!,
            categoryId = expenseDto.categoryId
        )

        expenseRepository.save(expense)

        return ResponseEntity.status(201).build()
    }

    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody expenseDto: ExpenseDto
    ): ResponseEntity<Void> {
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found") }

        expenseDto.amount?.let {
            expense.amount = it
        }
        expenseDto.categoryId?.let {
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

    @GetMapping("/{id}")
    fun get(
        @PathVariable id: UUID
    ): ResponseEntity<ExpenseDto> {
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found") }

        return ResponseEntity.ok(expense.toDto())
    }
}