package org.example.finfast.auth

import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.slf4j.LoggerFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPublicKey
import java.util.Base64
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@ApplicationScoped
class KeyRotationService(
    @ConfigProperty(name = "finfast.jwt.key-ttl-minutes", defaultValue = "1440") private val keyTtlMinutes: Long
) {
    private val logger = LoggerFactory.getLogger(KeyRotationService::class.java)
    
    data class StoredKey(
        val keyId: String,
        val keyPair: KeyPair,
        val createdAt: Long,
        val isActive: Boolean
    )
    
    private val keys = ConcurrentHashMap<String, StoredKey>()
    
    init {
        initializeInitialKey()
    }
    
    private fun initializeInitialKey() {
        val keyId = generateKeyId()
        val keyPair = generateKeyPair()
        val storedKey = StoredKey(
            keyId = keyId,
            keyPair = keyPair,
            createdAt = System.currentTimeMillis(),
            isActive = true
        )
        keys[keyId] = storedKey
        logger.info("Initialized initial RSA key with kid: $keyId")
    }
    
    fun getActiveKey(): StoredKey {
        val activeKey = keys.values.find { it.isActive }
            ?: throw IllegalStateException("No active key found")
        return activeKey
    }
    
    fun getKeyById(keyId: String): StoredKey? {
        return keys[keyId]
    }
    
    fun getAllKeys(): List<StoredKey> {
        return keys.values.toList()
    }
    
    private fun generateKeyId(): String {
        return UUID.randomUUID().toString()
    }
    
    private fun generateKeyPair(): KeyPair {
        val keyGen = KeyPairGenerator.getInstance("RSA")
        keyGen.initialize(2048)
        return keyGen.generateKeyPair()
    }
    
    fun convertToJwk(storedKey: StoredKey): org.example.finfast.auth.dto.Jwk {
        val publicKey = storedKey.keyPair.public as RSAPublicKey
        return org.example.finfast.auth.dto.Jwk(
            kty = "RSA",
            kid = storedKey.keyId,
            use = "sig",
            alg = "RS256",
            n = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.modulus.toByteArray()),
            e = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.publicExponent.toByteArray())
        )
    }
}
