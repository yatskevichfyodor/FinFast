package org.example.finfast.auth

import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/auth")
class AuthController(private val authService: AuthService) {
    @GetMapping("/me")
    fun currentUser(@AuthenticationPrincipal jwt: Jwt): UserResponse =
        authService.currentUser(UUID.fromString(jwt.subject))

    @PostMapping("/register")
    fun register(@RequestBody request: RegisterRequest) =
        ResponseEntity.status(201).body(authService.register(request))

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest) = authService.login(request)

    @PostMapping("/refresh")
    fun refresh(@RequestBody request: RefreshRequest) = authService.refresh(request)

    @PostMapping("/logout")
    fun logout(@RequestBody request: LogoutRequest): ResponseEntity<Void> {
        authService.logout(request)
        return ResponseEntity.noContent().build()
    }
}
