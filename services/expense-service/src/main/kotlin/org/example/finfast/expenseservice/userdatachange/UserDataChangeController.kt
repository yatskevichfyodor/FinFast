package org.example.finfast.expenseservice.userdatachange

import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/user-data-changes")
class UserDataChangeController(
    private val service: UserDataChangeService
) {
    @GetMapping
    fun getChanges(authentication: Authentication): List<UserDataChangeResponse> {
        val userId = UUID.fromString(authentication.name)
        return service.getChanges(userId)
            .map(UserDataChangeResponse::from)
    }
}