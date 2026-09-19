package org.example.finfast.auth.security

import io.quarkus.security.AuthenticationFailedException
import io.quarkus.security.identity.IdentityProviderManager
import io.quarkus.security.identity.SecurityIdentity
import io.quarkus.security.runtime.QuarkusSecurityIdentity
import io.quarkus.vertx.http.runtime.security.ChallengeData
import io.quarkus.vertx.http.runtime.security.HttpAuthenticationMechanism
import io.smallrye.mutiny.Uni
import io.smallrye.mutiny.infrastructure.Infrastructure
import io.vertx.ext.web.RoutingContext
import jakarta.enterprise.context.ApplicationScoped
import org.example.finfast.auth.service.JwtService
import org.slf4j.LoggerFactory
import java.security.Principal

@ApplicationScoped
class BearerTokenAuthenticationMechanism(
    private val jwtService: JwtService
) : HttpAuthenticationMechanism {
    private val logger = LoggerFactory.getLogger(javaClass)

    override fun authenticate(
        context: RoutingContext,
        identityProviderManager: IdentityProviderManager
    ): Uni<SecurityIdentity> {
        val token = context.request().getHeader("Authorization")
            ?.takeIf { it.startsWith("Bearer ") }
            ?.removePrefix("Bearer ")
            ?.takeIf { it.isNotBlank() }
            ?: return Uni.createFrom().optional(java.util.Optional.empty())

        return Uni.createFrom().item<SecurityIdentity> {
            val userId = jwtService.parseSubject(token)
            QuarkusSecurityIdentity.builder()
                .setPrincipal(UserPrincipal(userId))
                .build()
        }
            .runSubscriptionOn(Infrastructure.getDefaultWorkerPool())
            .onFailure()
            .invoke { exception ->
                logger.debug("Bearer token authentication failed: ${exception.message}")
            }
            .onFailure()
            .transform { exception -> AuthenticationFailedException(exception) }
    }

    override fun getChallenge(context: RoutingContext): Uni<ChallengeData> =
        Uni.createFrom().item(ChallengeData(401, "WWW-Authenticate", "Bearer"))

    private data class UserPrincipal(private val userId: String) : Principal {
        override fun getName(): String = userId
    }
}