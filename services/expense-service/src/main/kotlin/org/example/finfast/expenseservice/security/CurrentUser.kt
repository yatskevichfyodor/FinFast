package org.example.finfast.expenseservice.security

import org.example.finfast.expenseservice.AuthenticationRequiredException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class CurrentUser {
    fun id(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
            ?.takeIf { it.isAuthenticated }
            ?: throw AuthenticationRequiredException()
        return UUID.fromString(authentication.name)
    }
}