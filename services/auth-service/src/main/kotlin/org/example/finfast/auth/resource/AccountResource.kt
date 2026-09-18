package org.example.finfast.auth.resource

import io.quarkus.security.Authenticated
import io.quarkus.security.identity.SecurityIdentity
import jakarta.inject.Inject
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.example.finfast.auth.service.AccountService
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
    private val securityIdentity: SecurityIdentity
) {
    @GET
    fun currentUser(): UserResponse = accountService.currentUser(currentUserId())

    @PATCH
    fun updateProfile(
        request: UpdateProfileRequest
    ): UserResponse = accountService.updateProfile(currentUserId(), request)

    @DELETE
    fun deleteAccount(): Response {
        accountService.deleteAccount(currentUserId())
        return Response.accepted().build()
    }

    @PUT
    @Path("/password")
    fun setPassword(
        request: SetPasswordRequest
    ): UserResponse = accountService.setPassword(currentUserId(), request)

    @POST
    @Path("/google")
    fun linkGoogleAccount(
        request: GoogleIdTokenRequest
    ): UserResponse {
        return accountService.linkGoogleAccount(currentUserId(), request)
    }

    @DELETE
    @Path("/google")
    fun unlinkGoogleAccount(): UserResponse = accountService.unlinkGoogleAccount(currentUserId())

    private fun currentUserId(): UUID {
        val subject = securityIdentity.principal?.name?.takeIf { it.isNotBlank() }
            ?: throw WebApplicationException("Authenticated user is missing", 401)
        return try {
            UUID.fromString(subject)
        } catch (_: IllegalArgumentException) {
            throw WebApplicationException("Authenticated user id is invalid", 401)
        }
    }
}
