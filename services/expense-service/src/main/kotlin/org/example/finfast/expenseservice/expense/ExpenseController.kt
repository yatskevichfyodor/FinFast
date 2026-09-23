package org.example.finfast.expenseservice.expense

import org.example.finfast.expenseservice.expense.dto.ExpenseDto
import org.example.finfast.expenseservice.expense.dto.SyncExpensesDto
import org.example.finfast.expenseservice.expense.dto.UpdateExpenseDto
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

    /**
     * Returns a list of expenses. If `ids` query parameter is provided, it returns only the expenses with those IDs.
     * If `ids` is not provided, it returns all expenses for the current user.
     * Expenses marked for deletion are also returned.
     */
    @GetMapping
    fun getByIds(
        @RequestParam(required = false) ids: List<UUID>?
    ): ResponseEntity<List<ExpenseDto>> {
        return ResponseEntity.ok(
            if (ids == null) {
                expenseService.getAll()
            } else {
                expenseService.getByIds(ids)
            }
        )
    }

    @PostMapping
    fun create(
        @RequestBody dto: ExpenseDto
    ): ResponseEntity<Void> {
        expenseService.create(dto)

        return ResponseEntity.status(201).build()
    }

    @PostMapping("/sync")
    fun sync(
        @RequestBody dto: SyncExpensesDto
    ): ResponseEntity<Void> {
        expenseService.sync(dto)

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
}
