package org.example.finfast.auth.service

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.WebApplicationException
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.util.*

@ApplicationScoped
class JwtService(
    private val rsaKeyProvider: RsaKeyProvider,
    @ConfigProperty(name = "finfast.jwt.issuer") private val issuer: String,
    @ConfigProperty(name = "finfast.jwt.access-token-lifetime-seconds") private val accessTokenLifetimeSeconds: Long
) {

    fun createAccessToken(userId: UUID): String {
        val now = Instant.now()
        val activeKey = rsaKeyProvider.getActiveKey()
        
        val claims = JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(userId.toString())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plusSeconds(accessTokenLifetimeSeconds)))
            .jwtID(UUID.randomUUID().toString())
            .build()
        
        val header = JWSHeader.Builder(JWSAlgorithm.RS256).keyID(activeKey.keyId).build()
        val signed = SignedJWT(header, claims)
        signed.sign(RSASSASigner(activeKey.keyPair.private))
        return signed.serialize()
    }

    fun createPasskeyChallengeState(
        purpose: String,
        subject: String,
        username: String?,
        challenge: String
    ): Pair<String, UUID> {
        val stateId = UUID.randomUUID()
        val now = Instant.now()
        val activeKey = rsaKeyProvider.getActiveKey()
        val claimsBuilder = JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(subject)
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plusSeconds(300)))
            .jwtID(stateId.toString())
            .claim("purpose", purpose)
            .claim("challenge", challenge)
        if (username != null) claimsBuilder.claim("username", username)
        val signed = SignedJWT(
            JWSHeader.Builder(JWSAlgorithm.RS256).keyID(activeKey.keyId).build(),
            claimsBuilder.build()
        )
        signed.sign(RSASSASigner(activeKey.keyPair.private))
        return signed.serialize() to stateId
    }

    fun verifyPasskeyChallengeState(
        state: String,
        purpose: String,
        subject: String,
        username: String?
    ): PasskeyChallengeClaims {
        try {
            val signed = SignedJWT.parse(state)
            val keyId = signed.header.keyID ?: throw IllegalArgumentException("Missing signing key")
            val storedKey = rsaKeyProvider.getKeyById(keyId)
                ?: throw IllegalArgumentException("Unknown signing key")
            if (!signed.verify(RSASSAVerifier(storedKey.keyPair.public as RSAPublicKey))) {
                throw IllegalArgumentException("Invalid state signature")
            }
            val claims = signed.jwtClaimsSet
            val expiresAt = claims.expirationTime?.toInstant()
                ?: throw IllegalArgumentException("Missing expiration")
            val stateId = claims.jwtid?.let(UUID::fromString)
                ?: throw IllegalArgumentException("Missing state id")
            val actualUsername = claims.getStringClaim("username")
            if (expiresAt.isBefore(Instant.now()) || claims.issuer != issuer || claims.subject != subject ||
                claims.getStringClaim("purpose") != purpose || actualUsername != username
            ) {
                throw IllegalArgumentException("Invalid challenge state")
            }
            val challenge = claims.getStringClaim("challenge")
                ?.takeIf { it.isNotBlank() }
                ?: throw IllegalArgumentException("Missing challenge")
            return PasskeyChallengeClaims(stateId, challenge)
        } catch (exception: Exception) {
            throw WebApplicationException("Invalid or expired passkey challenge", 400)
        }
    }

    @Transactional
    fun parseSubject(token: String): String {
        val signed = SignedJWT.parse(token)
        val keyId = signed.header.keyID ?: throw WebApplicationException("Token missing key ID", 401)

        val storedKey = rsaKeyProvider.getKeyById(keyId)
            ?: throw WebApplicationException("Unknown key ID: $keyId", 401)
        
        val verifier = RSASSAVerifier(storedKey.keyPair.public as RSAPublicKey)
        if (!signed.verify(verifier)) throw WebApplicationException("Invalid token signature", 401)
        
        val claims = signed.jwtClaimsSet
        val exp = claims.expirationTime?.toInstant() ?: throw WebApplicationException("Invalid token", 401)
        if (exp.isBefore(Instant.now())) throw WebApplicationException("Token expired", 401)
        if (claims.issuer != issuer) throw WebApplicationException("Invalid issuer", 401)
        
        return claims.subject?.takeIf { it.isNotBlank() }
            ?: throw WebApplicationException("Token subject is missing", 401)
    }
}

data class PasskeyChallengeClaims(val stateId: UUID, val challenge: String)
