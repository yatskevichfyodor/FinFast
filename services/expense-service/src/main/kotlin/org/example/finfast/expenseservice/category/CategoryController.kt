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

    @PatchMapping("/custom/{id}")
    fun updateCustomCategory(@PathVariable id: UUID, @RequestBody input: CategoryInputDto) =
        ResponseEntity.ok(service.updateCustomCategory(id, input))

    @DeleteMapping("/custom/{id}")
    fun deleteCustomCategory(@PathVariable id: UUID): ResponseEntity<Void> {
        service.deleteCustomCategory(id); return ResponseEntity.noContent().build()
    }

    @PostMapping("/custom/{id}/restore")
    fun restoreCustomCategory(@PathVariable id: UUID): ResponseEntity<Void> {
        service.restoreCustomCategory(id); return ResponseEntity.ok().build()
    }

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