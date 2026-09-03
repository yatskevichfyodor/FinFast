package org.example.finfast.auth

import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.source.ImmutableJWKSet
import org.example.finfast.auth.config.JwtKeyProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.*
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class JwtService(
    keyProvider: JwtKeyProvider,
    @Value("\${finfast.jwt.issuer}") private val issuer: String,
    @Value("\${finfast.jwt.key-id}") private val keyId: String
) {
    private val encoder = NimbusJwtEncoder(
        ImmutableJWKSet(
            JWKSet(
                RSAKey.Builder(keyProvider.keyPair.public as java.security.interfaces.RSAPublicKey)
                    .privateKey(keyProvider.keyPair.private as java.security.interfaces.RSAPrivateKey)
                    .keyID(keyId)
                    .build()
            )
        )
    )

    fun createAccessToken(userId: UUID): String {
        val now = Instant.now()
        val claims = JwtClaimsSet.builder()
            .issuer(issuer)
            .subject(userId.toString())
            .issuedAt(now)
            .expiresAt(now.plusSeconds(600))
            .id(UUID.randomUUID().toString())
            .build()
        return encoder.encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(keyId).build(),
                claims
            )
        ).tokenValue
    }
}
