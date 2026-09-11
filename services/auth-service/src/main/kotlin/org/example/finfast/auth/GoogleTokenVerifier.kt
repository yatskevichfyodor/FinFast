package org.example.finfast.auth

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import jakarta.enterprise.context.ApplicationScoped
import jakarta.ws.rs.WebApplicationException
import org.eclipse.microprofile.config.inject.ConfigProperty

data class GoogleIdentity(val subject: String, val email: String?)

@ApplicationScoped
class GoogleTokenVerifier(
    @ConfigProperty(name = "finfast.google.client-id", defaultValue = "") private val clientId: String
) {
    private val verifier: GoogleIdTokenVerifier? by lazy {
        clientId.takeIf { it.isNotBlank() }?.let {
            GoogleIdTokenVerifier.Builder(NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(listOf(it))
                .setIssuers(listOf("https://accounts.google.com", "accounts.google.com"))
                .build()
        }
    }

    fun verify(credential: String): GoogleIdentity {
        val configuredVerifier = verifier
            ?: throw WebApplicationException("Вход через Google пока не настроен", 503)
        val payload = try {
            configuredVerifier.verify(credential)?.payload
        } catch (_: Exception) {
            null
        } ?: throw WebApplicationException("Не удалось подтвердить аккаунт Google", 401)

        val subject = payload.subject?.takeIf { it.isNotBlank() }
            ?: throw WebApplicationException("Google не передал идентификатор аккаунта", 401)
        return GoogleIdentity(subject, payload["email"] as? String)
    }
}
