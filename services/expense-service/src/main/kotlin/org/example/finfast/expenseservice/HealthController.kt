package org.example.finfast.expenseservice

import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class HealthController {
    @GetMapping("/health")
    fun get(): ResponseEntity<Void> {
        return ResponseEntity.ok().build();
    }
}