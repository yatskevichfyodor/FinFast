package org.example.finfast.auth

import java.util.UUID

data class RegisterRequest(val username: String, val password: String)
data class LoginRequest(val username: String, val password: String)
data class RefreshRequest(val refreshToken: String)
data class LogoutRequest(val refreshToken: String)
data class UserResponse(val id: UUID, val username: String)
data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long = 600
)
