package org.example.finfast.auth.resource

import io.quarkus.security.Authenticated
import io.quarkus.security.identity.SecurityIdentity
import io.quarkus.security.webauthn.WebAuthnLoginResponse
import io.quarkus.security.webauthn.WebAuthnRegisterResponse
import jakarta.inject.Inject
import jakarta.ws.rs.BeanParam
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.WebApplicationException
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.example.finfast.auth.dto.TokenResponse
import org.jboss.resteasy.reactive.RestForm
import io.vertx.ext.web.RoutingContext
import org.example.finfast.auth.service.PasskeyService
import java.util.UUID

@Path("/auth/passkey")
@Produces(MediaType.APPLICATION_JSON)
class PasskeyResource @Inject constructor(
    private val securityIdentity: SecurityIdentity,
    private val passkeyService: PasskeyService,
) {
    @POST
    @Path("/link")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Authenticated
    fun linkPasskey(
        @BeanParam userRegisterResponse: WebAuthnRegisterResponse,
        routingContext: RoutingContext
    ): Response {
        passkeyService.linkPasskey(currentUserId(), userRegisterResponse, routingContext)
        return Response.ok().build()
    }

    @POST
    @Path("/register")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    fun registerUser(
        @RestForm username: String,
        @BeanParam userRegisterResponse: WebAuthnRegisterResponse,
        context: RoutingContext
    ): TokenResponse = passkeyService.registerUser(username, userRegisterResponse, context)

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    fun login(
        @BeanParam userLoginResponse: WebAuthnLoginResponse,
        routingContext: RoutingContext
    ): TokenResponse = passkeyService.login(userLoginResponse, routingContext)

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