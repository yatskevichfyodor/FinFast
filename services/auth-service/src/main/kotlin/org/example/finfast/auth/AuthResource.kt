package org.example.finfast.auth

import io.quarkus.security.Authenticated
import jakarta.inject.Inject
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.example.finfast.auth.dto.LoginRequest
import org.example.finfast.auth.dto.LogoutRequest
import org.example.finfast.auth.dto.RefreshRequest
import org.example.finfast.auth.dto.RegisterRequest
import org.example.finfast.auth.dto.UserResponse
import java.util.UUID

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class AuthResource @Inject constructor(private val authService: AuthService, private val jwtService: JwtService) {
    @GET
    @Path("/me")
    @Authenticated
    fun currentUser(@HeaderParam("Authorization") authHeader: String?): UserResponse {
        val token = authHeader?.removePrefix("Bearer ") ?: throw WebApplicationException("Missing Authorization header", 401)
        val subject = jwtService.parseSubject(token)
        return authService.currentUser(UUID.fromString(subject))
    }

    @POST
    @Path("/register")
    fun register(request: RegisterRequest): Response =
        Response.status(201).entity(authService.register(request)).build()

    @POST
    @Path("/login")
    fun login(request: LoginRequest) = authService.login(request)

    @POST
    @Path("/refresh")
    fun refresh(request: RefreshRequest) = authService.refresh(request)

    @POST
    @Path("/logout")
    fun logout(request: LogoutRequest): Response {
        authService.logout(request)
        return Response.noContent().build()
    }
}
