package org.example.finfast.auth.resource

import io.quarkus.security.Authenticated
import jakarta.inject.Inject
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.example.finfast.auth.service.AccountService
import org.example.finfast.auth.JwtService
import org.example.finfast.auth.dto.GoogleIdTokenRequest
import org.example.finfast.auth.dto.SetPasswordRequest
import org.example.finfast.auth.dto.UpdateProfileRequest
import org.example.finfast.auth.dto.UserResponse
import java.util.UUID

@Path("/auth/me")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
class AccountResource @Inject constructor(
    private val accountService: AccountService,
    private val jwtService: JwtService
) {
    @GET
    fun currentUser(@HeaderParam("Authorization") authHeader: String?): UserResponse {
        return accountService.currentUser(currentUserId(authHeader))
    }

    @PATCH
    fun updateProfile(
        @HeaderParam("Authorization") authHeader: String?,
        request: UpdateProfileRequest
    ): UserResponse = accountService.updateProfile(currentUserId(authHeader), request)

    @DELETE
    fun deleteAccount(@HeaderParam("Authorization") authHeader: String?): Response {
        accountService.deleteAccount(currentUserId(authHeader))
        return Response.accepted().build()
    }

    @PUT
    @Path("/password")
    fun setPassword(
        @HeaderParam("Authorization") authHeader: String?,
        request: SetPasswordRequest
    ): UserResponse = accountService.setPassword(currentUserId(authHeader), request)

    @POST
    @Path("/google")
    fun linkGoogleAccount(
        @HeaderParam("Authorization") authHeader: String?,
        request: GoogleIdTokenRequest
    ): UserResponse {
        return accountService.linkGoogleAccount(currentUserId(authHeader), request)
    }

    @DELETE
    @Path("/google")
    fun unlinkGoogleAccount(@HeaderParam("Authorization") authHeader: String?): UserResponse =
        accountService.unlinkGoogleAccount(currentUserId(authHeader))

    private fun currentUserId(authHeader: String?): UUID {
        val token = authHeader?.removePrefix("Bearer ") ?: throw WebApplicationException("Missing Authorization header", 401)
        return UUID.fromString(jwtService.parseSubject(token))
    }
}
