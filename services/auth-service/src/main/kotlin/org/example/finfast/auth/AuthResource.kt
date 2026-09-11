package org.example.finfast.auth

import io.quarkus.security.Authenticated
import jakarta.inject.Inject
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.example.finfast.auth.dto.LoginRequest
import org.example.finfast.auth.dto.GoogleIdTokenRequest
import org.example.finfast.auth.dto.LogoutRequest
import org.example.finfast.auth.dto.RefreshRequest
import org.example.finfast.auth.dto.RegisterRequest
import org.example.finfast.auth.dto.UserResponse
import org.example.finfast.auth.dto.UpdateProfileRequest
import org.example.finfast.auth.dto.SetPasswordRequest
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

    @PATCH
    @Path("/me")
    @Authenticated
    fun updateProfile(
        @HeaderParam("Authorization") authHeader: String?,
        request: UpdateProfileRequest
    ): UserResponse = authService.updateProfile(currentUserId(authHeader), request)

    @DELETE
    @Path("/me")
    @Authenticated
    fun deleteAccount(@HeaderParam("Authorization") authHeader: String?): Response {
        authService.deleteAccount(currentUserId(authHeader))
        return Response.noContent().build()
    }

    @PUT
    @Path("/me/password")
    @Authenticated
    fun setPassword(
        @HeaderParam("Authorization") authHeader: String?,
        request: SetPasswordRequest
    ): UserResponse = authService.setPassword(currentUserId(authHeader), request)

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
    @Path("/google/link")
    @Authenticated
    fun linkGoogleAccount(
        @HeaderParam("Authorization") authHeader: String?,
        request: GoogleIdTokenRequest
    ): UserResponse {
        return authService.linkGoogleAccount(currentUserId(authHeader), request)
    }

    @DELETE
    @Path("/google/link")
    @Authenticated
    fun unlinkGoogleAccount(@HeaderParam("Authorization") authHeader: String?): UserResponse =
        authService.unlinkGoogleAccount(currentUserId(authHeader))

    @POST
    @Path("/refresh")
    fun refresh(request: RefreshRequest) = authService.refresh(request)

    @POST
    @Path("/logout")
    fun logout(request: LogoutRequest): Response {
        authService.logout(request)
        return Response.noContent().build()
    }

    private fun currentUserId(authHeader: String?): UUID {
        val token = authHeader?.removePrefix("Bearer ") ?: throw WebApplicationException("Missing Authorization header", 401)
        return UUID.fromString(jwtService.parseSubject(token))
    }
}
