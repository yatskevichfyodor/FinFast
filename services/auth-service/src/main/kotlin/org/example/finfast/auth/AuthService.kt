package org.example.finfast.auth

import io.quarkus.elytron.security.common.BcryptUtil
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.WebApplicationException
import org.example.finfast.auth.dto.LoginRequest
import org.example.finfast.auth.dto.GoogleIdTokenRequest
import org.example.finfast.auth.dto.LogoutRequest
import org.example.finfast.auth.dto.RefreshRequest
import org.example.finfast.auth.dto.RegisterRequest
import org.example.finfast.auth.dto.TokenResponse
import org.example.finfast.auth.dto.UserResponse
import org.example.finfast.auth.entity.RefreshToken
import org.example.finfast.auth.entity.User
import org.example.finfast.auth.repository.RefreshTokenRepository
import org.example.finfast.auth.repository.UserRepository
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Base64
import java.util.UUID

@ApplicationScoped
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val jwtService: JwtService,
    private val googleTokenVerifier: GoogleTokenVerifier
) {
    private val random = SecureRandom()

    @Transactional
    fun register(request: RegisterRequest): UserResponse {
        val username = request.username.trim()
        require(username.isNotBlank() && request.password.isNotBlank()) { "Username and password are required" }
        require(userRepository.findByUsername(username) == null) { "Username is already taken" }
        val user = userRepository.save(
            User(UUID.randomUUID(), username, BcryptUtil.bcryptHash(request.password))
        )
        return user.toResponse()
    }

    @Transactional
    fun login(request: LoginRequest): TokenResponse {
        val user = userRepository.findByUsername(request.username.trim())
        if (user == null || user.passwordHash == null || !BcryptUtil.matches(request.password, user.passwordHash)) {
            throw WebApplicationException("Invalid credentials", 401)
        }
        return issueTokens(user)
    }

    @Transactional
    fun currentUser(userId: UUID): UserResponse {
        val user = userRepository.findById(userId).orElseThrow {
            IllegalArgumentException("User not found")
        }
        return user.toResponse()
    }

    @Transactional
    fun loginWithGoogle(request: GoogleIdTokenRequest): TokenResponse {
        val identity = googleTokenVerifier.verify(request.credential)
        val user = userRepository.findByGoogleSubject(identity.subject)
            ?: userRepository.save(User(UUID.randomUUID(), uniqueGoogleUsername(identity.email), null, identity.subject, identity.email))
        return issueTokens(user)
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
        return user.toResponse()
    }

    @Transactional
    fun refresh(request: RefreshRequest): TokenResponse {
        val old = refreshTokenRepository.findByTokenHash(hash(request.refreshToken))
            ?: throw IllegalArgumentException("Invalid refresh token")
        require(old.revokedAt == null && old.expiresAt.isAfter(Instant.now())) {
            "Invalid refresh token"
        }
        old.revokedAt = Instant.now() // todo: delete too old tokens
        refreshTokenRepository.save(old)
        return issueTokens(userRepository.findById(old.userId).orElseThrow())
    }

    @Transactional
    fun logout(request: LogoutRequest) {
        refreshTokenRepository.findByTokenHash(hash(request.refreshToken))?.let {
            it.revokedAt = Instant.now()
            refreshTokenRepository.save(it)
        }
    }

    private fun issueTokens(user: User): TokenResponse {
        val refresh = ByteArray(64).also(random::nextBytes)
        val refreshValue = Base64.getUrlEncoder().withoutPadding().encodeToString(refresh)
        refreshTokenRepository.save(
            RefreshToken(
                UUID.randomUUID(), user.id, hash(refreshValue),
                Instant.now().plus(30, ChronoUnit.DAYS), Instant.now()
            )
        )
        return TokenResponse(jwtService.createAccessToken(user.id), refreshValue)
    }

    private fun uniqueGoogleUsername(email: String?): String {
        val base = (email?.substringBefore('@')?.takeIf { it.isNotBlank() } ?: "google-user")
            .take(90)
        var candidate = base
        var suffix = 2
        while (userRepository.findByUsername(candidate) != null) {
            candidate = "${base.take(90 - suffix.toString().length)}-$suffix"
            suffix++
        }
        return candidate
    }

    private fun User.toResponse() = UserResponse(id, username, googleSubject != null)

    private fun hash(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
