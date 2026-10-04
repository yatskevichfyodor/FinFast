package org.example.finfast.expenseservice.category

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/categories")
class CategoryController(private val service: CategoryService) {
    @GetMapping()
    fun getAllCategories() = ResponseEntity.ok(service.getAllCategories())

    @GetMapping("/custom")
    fun getCustomCategories() = ResponseEntity.ok(service.getCustomCategories())

    @PostMapping("/custom")
    fun createCustomCategory(@RequestBody input: CategoryInputDto) = ResponseEntity.status(201).body(service.createCustomCategory(input))

    @PatchMapping("/custom/{categoryId}")
    fun updateCustomCategory(@PathVariable categoryId: UUID, @RequestBody input: CategoryInputDto) =
        ResponseEntity.ok(service.updateCustomCategory(categoryId, input))

    @PostMapping("/custom/{categoryId}/hide")
    fun hideCustomCategory(@PathVariable categoryId: UUID): ResponseEntity<Void> {
        service.hideCustomCategory(categoryId); return ResponseEntity.ok().build()
    }

    @DeleteMapping("/custom/{categoryId}")
    fun deleteCustomCategory(@PathVariable categoryId: UUID): ResponseEntity<Void> {
        service.deleteCustomCategory(categoryId); return ResponseEntity.noContent().build()
    }

    @PostMapping("/custom/{categoryId}/restore")
    fun restoreCustomCategory(@PathVariable categoryId: UUID): ResponseEntity<Void> {
        service.restoreCustomCategory(categoryId); return ResponseEntity.ok().build()
    }

    @GetMapping("/custom/{categoryId}/count")
    fun getHiddenSystemCategories(@PathVariable categoryId: UUID) =
        ResponseEntity.ok(service.getNumberOfLinkedExpenses(categoryId))

    @GetMapping("/system/hidden")
    fun getHiddenSystemCategories() = ResponseEntity.ok(service.getHiddenSystemCategories())

    @PostMapping("/system/{id}/hide")
    fun hideSystemCategory(@PathVariable id: String): ResponseEntity<Void> {
        service.hideSystemCategory(id); return ResponseEntity.ok().build()
    }

    @PostMapping("/system/{id}/restore")
    fun restoreSystemCategory(@PathVariable id: String): ResponseEntity<Void> {
        service.restoreSystemCategory(id); return ResponseEntity.ok().build()
    }
}