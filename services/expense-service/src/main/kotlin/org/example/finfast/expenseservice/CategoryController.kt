package org.example.finfast.expenseservice

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/categories")
class CategoryController(private val service: CategoryService) {
    @GetMapping
    fun available() = ResponseEntity.ok(service.getAvailable())

    @GetMapping("/editor")
    fun editor() = ResponseEntity.ok(service.getAllForEditor())

    @PostMapping
    fun create(@RequestBody input: CategoryInputDto) = ResponseEntity.status(201).body(service.create(input))

    @PatchMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody input: CategoryInputDto) =
        ResponseEntity.ok(service.update(id, input))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        service.delete(id); return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/restore")
    fun restore(@PathVariable id: UUID): ResponseEntity<Void> {
        service.restore(id); return ResponseEntity.ok().build()
    }

    @PostMapping("/system/{id}/hide")
    fun hide(@PathVariable id: String): ResponseEntity<Void> {
        service.hideSystem(id); return ResponseEntity.ok().build()
    }

    @PostMapping("/system/{id}/restore")
    fun restoreSystem(@PathVariable id: String): ResponseEntity<Void> {
        service.restoreSystem(id); return ResponseEntity.ok().build()
    }
}