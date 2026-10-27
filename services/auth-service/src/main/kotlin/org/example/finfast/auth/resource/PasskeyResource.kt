package org.example.finfast.auth.resource

import io.quarkus.security.Authenticated
import io.quarkus.security.identity.SecurityIdentity
import io.quarkus.security.webauthn.WebAuthnLoginResponse
import io.quarkus.security.webauthn.WebAuthnRegisterResponse
import jakarta.inject.Inject
import jakarta.ws.rs.BeanParam
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.QueryParam
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
    @GET
    @Path("/link/register-options")
    @Produces(MediaType.APPLICATION_JSON)
    @Authenticated
    fun linkRegistrationOptions(
        @QueryParam("displayName") displayName: String?,
        routingContext: RoutingContext
    ): Response {
        routingContext.request().headers().remove("Cookie")
        val options = passkeyService.createLinkOptions(currentUserId(), displayName, routingContext)
        routingContext.response().headers().remove("Set-Cookie")
        return Response.ok(options).build()
    }

    @GET
    @Path("/register-options")
    @Produces(MediaType.APPLICATION_JSON)
    fun registrationOptions(
        @QueryParam("username") username: String,
        @QueryParam("displayName") displayName: String?,
        routingContext: RoutingContext
    ): Response {
        routingContext.request().headers().remove("Cookie")
        val options = passkeyService.createRegistrationOptions(username, displayName, routingContext)
        routingContext.response().headers().remove("Set-Cookie")
        return Response.ok(options).build()
    }

    @GET
    @Path("/login-options")
    @Produces(MediaType.APPLICATION_JSON)
    fun loginOptions(
        @QueryParam("username") username: String?,
        routingContext: RoutingContext
    ): Response {
        routingContext.request().headers().remove("Cookie")
        val options = passkeyService.createLoginOptions(username, routingContext)
        routingContext.response().headers().remove("Set-Cookie")
        return Response.ok(options).build()
    }

    @POST
    @Path("/link")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Authenticated
    fun linkPasskey(
        @BeanParam userRegisterResponse: WebAuthnRegisterResponse,
        @RestForm("challengeState") challengeState: String,
        routingContext: RoutingContext
    ): Response {
        passkeyService.linkPasskey(currentUserId(), userRegisterResponse, challengeState, routingContext)
        return Response.ok().build()
    }

    @DELETE
    @Path("/unlink")
    @Authenticated
    fun unlinkPasskey(): Response {
        val result = passkeyService.unlinkPasskey(currentUserId())
        return Response.ok(result).build()
    }

    @POST
    @Path("/register")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    fun registerUser(
        @RestForm username: String,
        @RestForm("challengeState") challengeState: String,
        @BeanParam userRegisterResponse: WebAuthnRegisterResponse,
        context: RoutingContext
    ): TokenResponse = passkeyService.registerUser(username, userRegisterResponse, challengeState, context)

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    fun login(
        @RestForm username: String?,
        @RestForm("challengeState") challengeState: String,
        @BeanParam userLoginResponse: WebAuthnLoginResponse,
        routingContext: RoutingContext
    ): TokenResponse {
        return passkeyService.login(username, challengeState, userLoginResponse, routingContext)
    }

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