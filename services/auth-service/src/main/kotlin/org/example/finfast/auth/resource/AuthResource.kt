package org.example.finfast.auth.resource

import jakarta.inject.Inject
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.example.finfast.auth.service.AuthService
import org.example.finfast.auth.service.KeyRotationService
import org.example.finfast.auth.dto.GoogleIdTokenRequest
import org.example.finfast.auth.dto.JwksResponse
import org.example.finfast.auth.dto.LoginRequest
import org.example.finfast.auth.dto.LogoutRequest
import org.example.finfast.auth.dto.RefreshRequest
import org.example.finfast.auth.dto.RegisterRequest

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class AuthResource @Inject constructor(
    private val authService: AuthService,
    private val keyRotationService: KeyRotationService
) {
    @POST
    @Path("/register")
    fun register(request: RegisterRequest): Response =
        Response.status(201).entity(authService.register(request)).build()

    @POST
    @Path("/login")
    fun login(request: LoginRequest) = authService.login(request)

    @POST
    @Path("/google")
    fun loginWithGoogle(request: GoogleIdTokenRequest) = authService.loginWithGoogle(request)

    @POST
    @Path("/refresh")
    fun refresh(request: RefreshRequest) = authService.refresh(request)

    @POST
    @Path("/logout")
    fun logout(request: LogoutRequest): Response {
        authService.logout(request)
        return Response.noContent().build()
    }

    @GET
    @Path("/.well-known/jwks.json")
    fun getJwks(): JwksResponse {
        val keys = keyRotationService.getAllKeys()
            .map { keyRotationService.convertToJwk(it) }
        return JwksResponse(keys)
    }
}
