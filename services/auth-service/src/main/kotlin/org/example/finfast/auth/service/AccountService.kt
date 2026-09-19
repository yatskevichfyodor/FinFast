package org.example.finfast.auth.service

import com.fasterxml.jackson.databind.ObjectMapper
import io.quarkus.elytron.security.common.BcryptUtil
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.WebApplicationException
import org.example.finfast.auth.dto.GoogleIdTokenRequest
import org.example.finfast.auth.dto.SetPasswordRequest
import org.example.finfast.auth.dto.UpdateProfileRequest
import org.example.finfast.auth.dto.UserResponse
import org.example.finfast.auth.outbox.OutboxEventPublisher
import org.example.finfast.auth.repository.RefreshTokenRepository
import org.example.finfast.auth.repository.UserRepository
import java.time.Instant
import java.util.*

@ApplicationScoped
class AccountService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val googleTokenVerifier: GoogleTokenVerifier,
    private val outboxEventPublisher: OutboxEventPublisher,
    private val objectMapper: ObjectMapper
) {
    @Transactional
    fun currentUser(userId: UUID): UserResponse {
        val user = userRepository.findById(userId).orElseThrow {
            IllegalArgumentException("User not found")
        }
        return UserResponse.fromUser(user)
    }

    @Transactional
    fun linkGoogleAccount(userId: UUID, request: GoogleIdTokenRequest): UserResponse {
        val identity = googleTokenVerifier.verify(request.credential)
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        val linkedUser = userRepository.findByGoogleSubject(identity.subject)
        if (linkedUser != null && linkedUser.id != user.id) {
            throw WebApplicationException("Этот аккаунт Google уже привязан к другому пользователю", 409)
        }
        user.googleSubject = identity.subject
        user.googleEmail = identity.email
        userRepository.save(user)
        return UserResponse.fromUser(user)
    }

    @Transactional
    fun unlinkGoogleAccount(userId: UUID): UserResponse {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        require(user.passwordHash != null) { "Нельзя отвязать Google: задайте пароль для аккаунта" }
        user.googleSubject = null
        user.googleEmail = null
        return UserResponse.fromUser(user)
    }

    @Transactional
    fun updateProfile(userId: UUID, request: UpdateProfileRequest): UserResponse {
        val username = request.username.trim()
        require(username.isNotBlank()) { "Имя пользователя не должно быть пустым" }
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        val existingUser = userRepository.findByUsername(username)
        require(existingUser == null || existingUser.id == user.id) { "Это имя пользователя уже занято" }
        user.username = username
        return UserResponse.fromUser(user)
    }

    @Transactional
    fun setPassword(userId: UUID, request: SetPasswordRequest): UserResponse {
        require(request.password.length >= 8) { "Пароль должен содержать не менее 8 символов" }
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        user.passwordHash = BcryptUtil.bcryptHash(request.password)
        return UserResponse.fromUser(user)
    }

    @Transactional
    fun deleteAccount(userId: UUID) {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }

        val eventPayload = mapOf(
            "eventId" to UUID.randomUUID(),
            "eventType" to "USER_DELETED",
            "userId" to user.id,
            "timestamp" to Instant.now()
        )
        val payloadJson = objectMapper.writeValueAsString(eventPayload)
        outboxEventPublisher.createOutboxEvent("USER_DELETED", user.id, payloadJson)

        refreshTokenRepository.deleteAllByUserId(user.id)
        userRepository.delete(user)
    }
}