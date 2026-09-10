package org.example.finfast.auth

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.JWSSigner
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import jakarta.enterprise.context.ApplicationScoped
import org.example.finfast.auth.config.JwtKeyProvider
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.util.Date
import java.util.UUID

@ApplicationScoped
class JwtService(
    private val keyProvider: JwtKeyProvider,
    @ConfigProperty(name = "finfast.jwt.issuer") private val issuer: String,
    @ConfigProperty(name = "finfast.jwt.key-id") private val keyId: String
) {
    private val signer: JWSSigner = RSASSASigner(keyProvider.keyPair.private)

    fun createAccessToken(userId: UUID): String {
        val now = Instant.now()
        val claims = JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(userId.toString())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plusSeconds(600)))
            .jwtID(UUID.randomUUID().toString())
            .build()
        val header = JWSHeader.Builder(JWSAlgorithm.RS256).keyID(keyId).build()
        val signed = SignedJWT(header, claims)
        signed.sign(signer)
        return signed.serialize()
    }

    fun parseSubject(token: String): String {
        val signed = SignedJWT.parse(token)
        val verifier = com.nimbusds.jose.crypto.RSASSAVerifier(keyProvider.keyPair.public as RSAPublicKey)
        if (!signed.verify(verifier)) throw IllegalArgumentException("Invalid token signature")
        val claims = signed.jwtClaimsSet
        val exp = claims.expirationTime?.toInstant() ?: throw IllegalArgumentException("Invalid token")
        if (exp.isBefore(Instant.now())) throw IllegalArgumentException("Token expired")
        if (claims.issuer != issuer) throw IllegalArgumentException("Invalid issuer")
        return claims.subject
    }
}
