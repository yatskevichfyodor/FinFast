package org.example.finfast.auth

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
import org.example.finfast.auth.config.JwtKeyProvider
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.util.*

@ApplicationScoped
class JwtService(
    private val keyProvider: JwtKeyProvider,
    private val keyRotationService: KeyRotationService,
    @ConfigProperty(name = "finfast.jwt.issuer") private val issuer: String,
    @ConfigProperty(name = "finfast.jwt.access-token-lifetime-seconds") private val accessTokenLifetimeSeconds: Long
) {

    fun createAccessToken(userId: UUID): String {
        val now = Instant.now()
        val keyPair = keyProvider.keyPair
        val keyId = keyProvider.currentKeyId
        
        val claims = JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(userId.toString())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plusSeconds(accessTokenLifetimeSeconds)))
            .jwtID(UUID.randomUUID().toString())
            .build()
        
        val header = JWSHeader.Builder(JWSAlgorithm.RS256).keyID(keyId).build()
        val signed = SignedJWT(header, claims)
        signed.sign(RSASSASigner(keyPair.private))
        return signed.serialize()
    }

    @Transactional
    fun parseSubject(token: String): String {
        val signed = SignedJWT.parse(token)
        val keyId = signed.header.keyID ?: throw WebApplicationException("Token missing key ID", 401)

        val storedKey = keyRotationService.getKeyById(keyId)
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
