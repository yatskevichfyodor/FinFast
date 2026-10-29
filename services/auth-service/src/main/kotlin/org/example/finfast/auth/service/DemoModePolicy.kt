package org.example.finfast.auth.service

import jakarta.enterprise.context.ApplicationScoped
import jakarta.ws.rs.WebApplicationException
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.example.finfast.auth.entity.User
import java.util.Optional

@ApplicationScoped
class DemoModePolicy(
    @ConfigProperty(name = "finfast.demo-mode.enabled")
    private val enabled: Boolean,
    @ConfigProperty(name = "finfast.demo-mode.allowed-emails")
    private val allowedEmails: Optional<String>
) {
    companion object {
        const val DEMO_USERNAME = "demo"
        const val REGISTRATION_DENIED_MESSAGE =
            "Регистрация новых пользователей в демонстрационном режиме недоступна"
        const val PASSKEY_REGISTRATION_DENIED_MESSAGE =
            "Регистрация через passkey в демонстрационном режиме недоступна"
    }

    private val normalizedAllowedEmails by lazy {
        allowedEmails.orElse("").split(',')
            .map { it.trim().lowercase() }
            .filter { it.isNotBlank() }
            .toSet()
    }

    fun requirePasswordRegistrationAllowed(username: String) {
        if (enabled && !isDemoUsername(username)) {
            throw WebApplicationException(REGISTRATION_DENIED_MESSAGE, 403)
        }
    }

    fun requireGoogleRegistrationAllowed(email: String?, emailVerified: Boolean) {
        val isAllowedEmail = email?.trim()?.lowercase()?.let { it in normalizedAllowedEmails } == true
        if (enabled && (!emailVerified || !isAllowedEmail)) {
            throw WebApplicationException(REGISTRATION_DENIED_MESSAGE, 403)
        }
    }

    fun requirePasskeyRegistrationAllowed() {
        if (enabled) {
            throw WebApplicationException(PASSKEY_REGISTRATION_DENIED_MESSAGE, 403)
        }
    }

    fun requireNotDemoUser(user: User, action: String) {
        if (isDemoUsername(user.username)) {
            val message = when (action) {
                "delete" -> "Демонстрационный аккаунт нельзя удалить"
                "email" -> "К демонстрационному аккаунту нельзя привязать email"
                else -> "К демонстрационному аккаунту нельзя привязать passkey"
            }
            throw WebApplicationException(message, 403)
        }
    }

    fun isDemoUsername(username: String?): Boolean = username.equals(DEMO_USERNAME, ignoreCase = true)
}