package org.example.finfast.auth

import org.example.finfast.auth.dto.LoginRequest
import org.example.finfast.auth.dto.LogoutRequest
import org.example.finfast.auth.dto.RefreshRequest
import org.example.finfast.auth.dto.RegisterRequest
import org.example.finfast.auth.dto.TokenResponse
import org.example.finfast.auth.dto.UserResponse
import org.example.finfast.auth.entity.RefreshToken
import org.example.finfast.auth.entity.User
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Base64
import java.util.UUID

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService
) {
    private val random = SecureRandom()

    @Transactional
    fun register(request: RegisterRequest): UserResponse {
        val username = request.username.trim()
        require(username.isNotBlank() && request.password.isNotBlank()) { "Username and password are required" }
        require(userRepository.findByUsername(username) == null) { "Username is already taken" }
        val user = userRepository.save(
            User(UUID.randomUUID(), username, passwordEncoder.encode(request.password)!!)
        )
        return UserResponse(user.id, user.username)
    }

    @Transactional
    fun login(request: LoginRequest): TokenResponse {
        val user = userRepository.findByUsername(request.username.trim())
        require(user != null && passwordEncoder.matches(request.password, user.passwordHash)) {
            "Invalid credentials"
        }
        return issueTokens(user)
    }

    @Transactional(readOnly = true)
    fun currentUser(userId: UUID): UserResponse {
        val user = userRepository.findById(userId).orElseThrow {
            IllegalArgumentException("User not found")
        }
        return UserResponse(user.id, user.username)
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

    private fun hash(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
