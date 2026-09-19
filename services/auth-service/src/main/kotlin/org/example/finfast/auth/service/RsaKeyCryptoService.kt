package org.example.finfast.auth.service

import jakarta.enterprise.context.ApplicationScoped
import org.example.finfast.auth.dto.Jwk
import org.example.finfast.auth.entity.RsaKey
import org.example.finfast.auth.service.RsaKeyProvider.StoredKey
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.time.Instant
import java.util.Base64
import java.util.UUID

@ApplicationScoped
class RsaKeyCryptoService {
    fun createNewKey(): RsaKey {
        val keyPair = generateKeyPair()
        return RsaKey(
            id = UUID.randomUUID(),
            keyId = UUID.randomUUID().toString(),
            privateKey = Base64.getEncoder().encodeToString(keyPair.private.encoded),
            publicKey = Base64.getEncoder().encodeToString(keyPair.public.encoded),
            isActive = true,
            createdAt = Instant.now(),
            deactivatedAt = null
        )
    }

    fun convertToStoredKey(dbKey: RsaKey): StoredKey {
        return StoredKey(
            keyId = dbKey.keyId,
            keyPair = deserializeKeyPair(dbKey.privateKey, dbKey.publicKey),
            createdAt = dbKey.createdAt,
            isActive = dbKey.isActive
        )
    }

    fun convertToJwk(storedKey: StoredKey): Jwk {
        val publicKey = storedKey.keyPair.public as RSAPublicKey
        return Jwk(
            kty = "RSA",
            kid = storedKey.keyId,
            use = "sig",
            alg = "RS256",
            n = encodeUnsigned(publicKey.modulus.toByteArray()),
            e = encodeUnsigned(publicKey.publicExponent.toByteArray())
        )
    }

    private fun deserializeKeyPair(privateKeyB64: String, publicKeyB64: String): KeyPair {
        val factory = KeyFactory.getInstance("RSA")
        val privateKey = factory.generatePrivate(
            PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateKeyB64))
        ) as RSAPrivateKey
        val publicKey = factory.generatePublic(
            X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyB64))
        ) as RSAPublicKey
        return KeyPair(publicKey, privateKey)
    }

    private fun generateKeyPair(): KeyPair {
        val keyGenerator = KeyPairGenerator.getInstance("RSA")
        keyGenerator.initialize(2048)
        return keyGenerator.generateKeyPair()
    }

    private fun encodeUnsigned(value: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(value.dropWhile { it == 0.toByte() }.toByteArray())
}
