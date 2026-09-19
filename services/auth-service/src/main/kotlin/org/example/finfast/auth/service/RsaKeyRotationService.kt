package org.example.finfast.auth.service

import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.example.finfast.auth.entity.RsaKey
import org.example.finfast.auth.repository.RsaKeyRepository
import org.slf4j.LoggerFactory
import java.time.Duration
import java.time.Instant

@ApplicationScoped
class RsaKeyRotationService(
    private val rsaKeyRepository: RsaKeyRepository,
    private val rsaKeyCryptoService: RsaKeyCryptoService,
    @ConfigProperty(name = "finfast.jwt.key-ttl-minutes") private val keyTtlMinutes: Long,
    @ConfigProperty(name = "finfast.jwt.rotation-interval") private val rotationInterval: Duration
) {
    private val logger = LoggerFactory.getLogger(RsaKeyRotationService::class.java)

    fun initializeKeys() {
        val dbKeys = rsaKeyRepository.findAll()
        logger.info("Found {} keys in database", dbKeys.size)

        if (dbKeys.isEmpty()) {
            logger.info("No keys found in database, creating initial key")
            rsaKeyRepository.save(rsaKeyCryptoService.createNewKey())
            logger.info("Created and saved initial RSA key")
        } else {
            logger.info("Loaded {} keys from database", dbKeys.size)
        }
    }

    fun checkAndPerformRotationIfNeeded() {
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
            logger.info("Next rotation in {} minutes", minutesUntilRotation)
        }
    }

    fun rotateKeys() {
        logger.info("Starting scheduled key rotation")
        deactivateCurrentKey()

        val newRsaKey = rsaKeyCryptoService.createNewKey()
        rsaKeyRepository.save(newRsaKey)
        logger.info("Created new active key with kid: {}", newRsaKey.keyId)

        cleanupExpiredKeys()
        val totalKeys = rsaKeyRepository.findAll().size
        logger.info("Key rotation completed. New active key kid: {}, total keys: {}", newRsaKey.keyId, totalKeys)
    }

    private fun deactivateCurrentKey() {
        val currentActiveKey = rsaKeyRepository.findActiveKey() ?: return
        val deactivatedKey = RsaKey(
            id = currentActiveKey.id,
            keyId = currentActiveKey.keyId,
            privateKey = currentActiveKey.privateKey,
            publicKey = currentActiveKey.publicKey,
            isActive = false,
            createdAt = currentActiveKey.createdAt,
            deactivatedAt = Instant.now()
        )
        rsaKeyRepository.save(deactivatedKey)
        logger.info("Deactivated key with kid: {}", currentActiveKey.keyId)
    }

    private fun cleanupExpiredKeys() {
        val retentionThreshold = Instant.now().minus(Duration.ofMinutes(keyTtlMinutes))
        val expiredKeys = rsaKeyRepository.findInactiveKeysOlderThan(retentionThreshold)

        expiredKeys.forEach { key ->
            rsaKeyRepository.delete(key)
            logger.info("Removed expired key with kid: {}", key.keyId)
        }

        if (expiredKeys.isNotEmpty()) {
            val remainingKeys = rsaKeyRepository.findAll().size
            logger.info("Cleaned up {} expired keys. Remaining keys: {}", expiredKeys.size, remainingKeys)
        }
    }
}
