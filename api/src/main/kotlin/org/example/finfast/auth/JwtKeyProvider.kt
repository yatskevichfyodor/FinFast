package org.example.org.example.finfast.auth

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

@Component
class JwtKeyProvider(
    @Value("\${finfast.jwt.private-key-b64:}") private val privateKeyB64: String,
    @Value("\${finfast.jwt.public-key-b64:}") private val publicKeyB64: String
) {
    val keyPair: KeyPair = loadKeyPair()

    private fun loadKeyPair(): KeyPair {
        if (privateKeyB64.isBlank() || publicKeyB64.isBlank()) {
            return KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        }

        val factory = KeyFactory.getInstance("RSA")
        val privateKey = factory.generatePrivate(
            PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateKeyB64))
        ) as RSAPrivateKey
        val publicKey = factory.generatePublic(
            X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyB64))
        ) as RSAPublicKey
        return KeyPair(publicKey, privateKey)
    }
}
