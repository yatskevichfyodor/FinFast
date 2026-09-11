package org.example.finfast.expense.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.security.KeyFactory
import java.security.interfaces.RSAPublicKey
import java.security.spec.X509EncodedKeySpec
import java.util.*

@Component
class JwtKeyProvider(
    @Value("\${finfast.jwt.public-key-b64:}") private val publicKeyB64: String
) {
    val publicKey: RSAPublicKey = loadPublicKey()

    private fun loadPublicKey(): RSAPublicKey {
        val factory = KeyFactory.getInstance("RSA")
        return factory.generatePublic(
            X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyB64))
        ) as RSAPublicKey
    }
}
