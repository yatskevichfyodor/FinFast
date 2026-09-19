package org.example.finfast.auth.service

import io.quarkus.runtime.StartupEvent
import io.quarkus.scheduler.Scheduled
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.Observes
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.example.finfast.auth.dto.Jwk
import org.example.finfast.auth.entity.RsaKey
import org.example.finfast.auth.repository.RsaKeyRepository
import org.slf4j.LoggerFactory
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.UUID

@ApplicationScoped
class KeyRotationService(
    private val rsaKeyRepository: RsaKeyRepository,
    @ConfigProperty(name = "finfast.jwt.key-ttl-minutes") private val keyTtlMinutes: Long,
    @ConfigProperty(name = "finfast.jwt.rotation-interval") private val rotationInterval: Duration
) {
    private val logger = LoggerFactory.getLogger(KeyRotationService::class.java)
    
    data class StoredKey(
        val keyId: String,
        val keyPair: KeyPair,
        val createdAt: Instant,
        val isActive: Boolean
    )
    
    fun onStart(@Observes event: StartupEvent) {
        logger.info("Loading RSA keys from database on startup")
        loadKeysFromDatabase()
        checkAndPerformRotationIfNeeded()
    }
    
    private fun loadKeysFromDatabase() {
        val dbKeys = rsaKeyRepository.findAll()
        logger.info("Found ${dbKeys.size} keys in database")
        
        if (dbKeys.isEmpty()) {
            logger.info("No keys found in database, creating initial key")
            createAndSaveInitialKey()
        } else {
            logger.info("Loaded ${dbKeys.size} keys from database")
        }
    }
    
    private fun createAndSaveInitialKey() {
        val keyId = generateKeyId()
        val keyPair = generateKeyPair()
        val now = Instant.now()
        
        val rsaKey = RsaKey(
            id = UUID.randomUUID(),
            keyId = keyId,
            privateKey = Base64.getEncoder().encodeToString(keyPair.private.encoded),
            publicKey = Base64.getEncoder().encodeToString(keyPair.public.encoded),
            isActive = true,
            createdAt = now,
            deactivatedAt = null
        )
        
        rsaKeyRepository.save(rsaKey)
        logger.info("Created and saved initial RSA key with kid: $keyId")
    }
    
    private fun checkAndPerformRotationIfNeeded() {
        val activeKey = rsaKeyRepository.findActiveKey()
        
        if (activeKey == null) {
            logger.warn("No active key found, performing rotation")
            rotateKeys()
            return
        }
        
        val rotationThreshold = activeKey.createdAt.plus(rotationInterval)
        val now = Instant.now()
        
        if (now.isAfter(rotationThreshold)) {
            logger.info("Rotation interval has passed, performing rotation")
            rotateKeys()
        } else {
            val minutesUntilRotation = Duration.between(now, rotationThreshold).toMinutes()
            logger.info("Next rotation in $minutesUntilRotation minutes")
        }
    }
    
    @Scheduled(every = "{finfast.jwt.rotation-interval}")
    fun rotateKeys() {
        logger.info("Starting scheduled key rotation")
        
        val currentActiveKey = rsaKeyRepository.findActiveKey()
        
        // Deactivate old active key
        currentActiveKey?.let {
            val deactivatedKey = RsaKey(
                id = it.id,
                keyId = it.keyId,
                privateKey = it.privateKey,
                publicKey = it.publicKey,
                isActive = false,
                createdAt = it.createdAt,
                deactivatedAt = Instant.now()
            )
            rsaKeyRepository.save(deactivatedKey)
            logger.info("Deactivated key with kid: ${it.keyId}")
        }
        
        // Generate and save new key
        val newKeyId = generateKeyId()
        val newKeyPair = generateKeyPair()
        val now = Instant.now()
        
        val newRsaKey = RsaKey(
            id = UUID.randomUUID(),
            keyId = newKeyId,
            privateKey = Base64.getEncoder().encodeToString(newKeyPair.private.encoded),
            publicKey = Base64.getEncoder().encodeToString(newKeyPair.public.encoded),
            isActive = true,
            createdAt = now,
            deactivatedAt = null
        )
        
        rsaKeyRepository.save(newRsaKey)
        logger.info("Created new active key with kid: $newKeyId")
        
        // Clean up expired keys
        cleanupExpiredKeys()
        
        val totalKeys = rsaKeyRepository.findAll().size
        logger.info("Key rotation completed. New active key kid: $newKeyId, total keys: $totalKeys")
    }

    private fun cleanupExpiredKeys() {
        val retentionThreshold = Instant.now().minus(Duration.ofMinutes(keyTtlMinutes))
        val expiredKeys = rsaKeyRepository.findInactiveKeysOlderThan(retentionThreshold)
        
        expiredKeys.forEach { key ->
            rsaKeyRepository.delete(key)
            logger.info("Removed expired key with kid: ${key.keyId}")
        }
        
        if (expiredKeys.isNotEmpty()) {
            val remainingKeys = rsaKeyRepository.findAll().size
            logger.info("Cleaned up ${expiredKeys.size} expired keys. Remaining keys: $remainingKeys")
        }
    }
    
    fun getActiveKey(): StoredKey {
        val dbKey = rsaKeyRepository.findActiveKey()
            ?: throw IllegalStateException("No active key found in database")
        
        return convertToStoredKey(dbKey)
    }
    
    fun getKeyById(keyId: String): StoredKey? {
        val dbKey = rsaKeyRepository.findByKeyId(keyId) ?: return null
        return convertToStoredKey(dbKey)
    }
    
    fun getAllKeys(): List<StoredKey> {
        val dbKeys = rsaKeyRepository.findAll()
        return dbKeys.map { convertToStoredKey(it) }
    }
    
    private fun convertToStoredKey(dbKey: RsaKey): StoredKey {
        val keyPair = deserializeKeyPair(dbKey.privateKey, dbKey.publicKey)
        return StoredKey(
            keyId = dbKey.keyId,
            keyPair = keyPair,
            createdAt = dbKey.createdAt,
            isActive = dbKey.isActive
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
    
    private fun generateKeyId(): String {
        return UUID.randomUUID().toString()
    }
    
    private fun generateKeyPair(): KeyPair {
        val keyGen = KeyPairGenerator.getInstance("RSA")
        keyGen.initialize(2048)
        return keyGen.generateKeyPair()
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

    private fun encodeUnsigned(value: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(value.dropWhile { it == 0.toByte() }.toByteArray())
}
