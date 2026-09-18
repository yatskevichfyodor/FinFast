package org.example.finfast.auth.service

import io.quarkus.elytron.security.common.BcryptUtil
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.WebApplicationException
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.example.finfast.auth.GoogleTokenVerifier
import org.example.finfast.auth.JwtService
import org.example.finfast.auth.dto.*
import org.example.finfast.auth.entity.RefreshToken
import org.example.finfast.auth.entity.User
import org.example.finfast.auth.repository.RefreshTokenRepository
import org.example.finfast.auth.repository.UserRepository
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

@ApplicationScoped
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val jwtService: JwtService,
    private val googleTokenVerifier: GoogleTokenVerifier,
    @ConfigProperty(name = "finfast.jwt.access-token-lifetime-seconds") private val accessTokenLifetimeSeconds: Long
) {
    private val random = SecureRandom()

    @Transactional
    fun register(request: RegisterRequest): UserResponse {
        val username = request.username.trim()
        require(username.isNotBlank() && request.password.isNotBlank()) { "Username and password are required" }
        if (userRepository.findByUsername(username) != null) {
            throw WebApplicationException("Username is already taken", 409)
        }
        val user = userRepository.save(
            User(UUID.randomUUID(), username, BcryptUtil.bcryptHash(request.password))
        )
        return UserResponse.fromUser(user)
    }

    @Transactional
    fun login(request: LoginRequest): TokenResponse {
        val user = userRepository.findByUsername(request.username.trim())
        if (user?.passwordHash == null || !BcryptUtil.matches(request.password, user.passwordHash)) {
            throw WebApplicationException("Invalid credentials", 401)
        }
        return issueTokens(user)
    }

    @Transactional
    fun loginWithGoogle(request: GoogleIdTokenRequest): TokenResponse {
        val identity = googleTokenVerifier.verify(request.credential)
        val user = userRepository.findByGoogleSubject(identity.subject)
            ?: userRepository.save(User(UUID.randomUUID(), uniqueGoogleUsername(identity.email), null, identity.subject, identity.email))
        return issueTokens(user)
    }

    @Transactional
    fun refresh(request: RefreshRequest): TokenResponse {
        val old = refreshTokenRepository.findByTokenHash(hash(request.refreshToken))
            ?: throw IllegalArgumentException("Invalid refresh token")

        if (old.revokedAt != null) {
            throw IllegalArgumentException("Refresh token already revoked")
        }

        if (!old.expiresAt.isAfter(Instant.now())) {
            throw IllegalArgumentException("Refresh token expired")
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
        val accessTokenResult = jwtService.createAccessToken(user.id)
        return TokenResponse(accessTokenResult, refreshValue, expiresIn = accessTokenLifetimeSeconds)
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

    private fun hash(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
