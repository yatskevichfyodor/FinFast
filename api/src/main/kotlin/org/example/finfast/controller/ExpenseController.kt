package org.example.org.example.finfast.controller

import org.example.org.example.finfast.dto.BatchUpdateExpenseDto
import org.example.org.example.finfast.dto.ExpenseDto
import org.example.org.example.finfast.dto.SyncExpensesDto
import org.example.org.example.finfast.dto.UpdateExpenseDto
import org.example.org.example.finfast.service.ExpenseService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/expenses")
class ExpenseController(
    private val expenseService: ExpenseService
) {
    @GetMapping("/{id}")
    fun get(
        @PathVariable id: UUID
    ): ResponseEntity<ExpenseDto> {
        return ResponseEntity.ok(
            expenseService.get(id)
        )
    }

    @GetMapping
    fun getByIds(
        @RequestParam ids: List<UUID>
    ): ResponseEntity<List<ExpenseDto>> {
        return ResponseEntity.ok(
            expenseService.getByIds(ids)
        )
    }

    @PostMapping
    fun create(
        @RequestBody dto: ExpenseDto
    ): ResponseEntity<Void> {
        expenseService.create(dto)

        return ResponseEntity.status(201).build()
    }

    @PostMapping("/batch")
    fun createBatch(
        @RequestBody dtos: List<ExpenseDto>
    ): ResponseEntity<Void> {
        expenseService.createBatch(dtos)

        return ResponseEntity.status(201).build()
    }

    @PostMapping("/sync")
    fun sync(
        @RequestBody dto: SyncExpensesDto
    ): ResponseEntity<Void> {
        expenseService.sync(dto)

        return ResponseEntity.ok().build()
    }

    @PatchMapping("/batch")
    fun updateBatch(
        @RequestBody dtos: List<BatchUpdateExpenseDto>
    ): ResponseEntity<Void> {
        expenseService.updateBatch(dtos)

        return ResponseEntity.ok().build()
    }

    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody dto: UpdateExpenseDto
    ): ResponseEntity<Void> {
        expenseService.update(id, dto)

        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: UUID
    ): ResponseEntity<Void> {
        return if (expenseService.delete(id)) {
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/batch")
    fun deleteBatch(
        @RequestBody ids: List<UUID>
    ): ResponseEntity<Void> {
        expenseService.deleteBatch(ids)

        return ResponseEntity.noContent().build()
    }
}