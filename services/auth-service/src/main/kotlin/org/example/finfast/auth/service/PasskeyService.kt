package org.example.finfast.auth.service

import io.quarkus.security.webauthn.WebAuthnCredentialRecord
import io.quarkus.security.webauthn.WebAuthnLoginResponse
import io.quarkus.security.webauthn.WebAuthnRegisterResponse
import io.quarkus.security.webauthn.WebAuthnSecurity
import io.vertx.ext.web.RoutingContext
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.WebApplicationException
import org.example.finfast.auth.entity.User
import org.example.finfast.auth.entity.WebAuthnCredential
import org.example.finfast.auth.dto.TokenResponse
import org.example.finfast.auth.repository.UserRepository
import org.example.finfast.auth.repository.WebAuthnCredentialRepository
import java.util.UUID

@ApplicationScoped
class PasskeyService(
    private val userRepository: UserRepository,
    private val credentialRepository: WebAuthnCredentialRepository,
    private val webAuthnSecurity: WebAuthnSecurity,
    private val authService: AuthService,
) {
    @Transactional
    fun linkPasskey(
        userId: UUID,
        userRegisterResponse: WebAuthnRegisterResponse,
        routingContext: RoutingContext
    ) {
        val user = getUserById(userId)

        val credentialRecord = webAuthnSecurity.register(
            user.username,
            userRegisterResponse,
            routingContext
        ).await().indefinitely()

        if (credentialRecord.requiredPersistedData.username != user.username) {
            throw WebApplicationException("Passkey registration identity does not match the account", 400)
        }
        saveCredential(user.id, credentialRecord)
    }

    @Transactional
    fun unlinkPasskey(userId: UUID) {
        val user = getUserById(userId)
        if (user.passwordHash == null && user.googleSubject == null) {
            throw WebApplicationException(
                "Нельзя отвязать passkey: сначала добавьте пароль или привяжите Google",
                409
            )
        }
        credentialRepository.deleteAllByUserId(user.id)
    }

    @Transactional
    fun registerUser(
        username: String,
        userRegisterResponse: WebAuthnRegisterResponse,
        routingContext: RoutingContext
    ): TokenResponse {
        if (!userRegisterResponse.isSet || !userRegisterResponse.isValid) {
            throw WebApplicationException("Invalid passkey registration response", 400)
        }
        val normalizedUsername = username.trim()
        if (normalizedUsername.isBlank() || normalizedUsername.length > 100) {
            throw WebApplicationException("Username must contain between 1 and 100 characters", 400)
        }
        if (userRepository.existsByUsername(normalizedUsername)) throw WebApplicationException("Username already exists", 409)

        val credentialRecord = webAuthnSecurity.register(
            normalizedUsername,
            userRegisterResponse,
            routingContext
        ).await().indefinitely()

        if (credentialRecord.requiredPersistedData.username != normalizedUsername) {
            throw WebApplicationException("Passkey registration identity does not match the account", 400)
        }

        val user = userRepository.save(
            User(
                id = UUID.randomUUID(),
                username = normalizedUsername,
                passwordHash = null
            )
        )

        saveCredential(user.id, credentialRecord)
        return authService.issueTokens(user)
    }

    @Transactional
    fun login(userLoginResponse: WebAuthnLoginResponse, routingContext: RoutingContext): TokenResponse {
        if (!userLoginResponse.isSet || !userLoginResponse.isValid) {
            throw WebApplicationException("Invalid passkey response", 400)
        }

        val credentialRecord = try {
            webAuthnSecurity.login(userLoginResponse, routingContext).await().indefinitely()
        } catch (exception: Exception) {
            throw WebApplicationException("Passkey authentication failed", exception, 401)
        }
        val persistedData = credentialRecord.requiredPersistedData
        val user = userRepository.findByUsername(persistedData.username)
            ?: throw WebApplicationException("Passkey user not found", 401)
        val credential = credentialRepository.findByCredentialId(persistedData.credentialId)
            ?: throw WebApplicationException("Passkey credential not found", 401)
        if (credential.user.id != user.id) {
            throw WebApplicationException("Passkey credential does not belong to the user", 401)
        }
        credential.counter = persistedData.counter
        return authService.issueTokens(user)
    }

    private fun getUserById(userId: UUID): User {
        return userRepository.findByIdOptional(userId).orElseThrow { WebApplicationException("User not found", 404) }
    }

    private fun saveCredential(userId: UUID, record: WebAuthnCredentialRecord) {
        val data = record.requiredPersistedData
        if (credentialRepository.findByCredentialId(data.credentialId) != null) {
            throw WebApplicationException("Passkey is already linked", 409)
        }
        val user = userRepository.findByIdOptional(userId).orElseThrow()
        credentialRepository.persist(
            WebAuthnCredential(
                user = user,
                credentialId = data.credentialId,
                publicKey = data.publicKey,
                publicKeyAlgorithm = data.publicKeyAlgorithm,
                counter = data.counter,
                aaguid = data.aaguid
            )
        )
    }

}