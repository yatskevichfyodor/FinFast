package org.example.finfast.auth.service

import jakarta.enterprise.context.ApplicationScoped
import org.example.finfast.auth.dto.Jwk
import org.example.finfast.auth.repository.RsaKeyRepository
import java.security.KeyPair
import java.time.Instant

@ApplicationScoped
class RsaKeyProvider(
    private val rsaKeyRepository: RsaKeyRepository,
    private val rsaKeyCryptoService: RsaKeyCryptoService
) {
    data class StoredKey(
        val keyId: String,
        val keyPair: KeyPair,
        val createdAt: Instant,
        val isActive: Boolean
    )

    fun getActiveKey(): StoredKey {
        val dbKey = rsaKeyRepository.findActiveKey()
            ?: throw IllegalStateException("No active key found in database")
        return rsaKeyCryptoService.convertToStoredKey(dbKey)
    }

    fun getKeyById(keyId: String): StoredKey? {
        val dbKey = rsaKeyRepository.findByKeyId(keyId) ?: return null
        return rsaKeyCryptoService.convertToStoredKey(dbKey)
    }

    fun getJwks(): List<Jwk> =
        getAllKeys().map { rsaKeyCryptoService.convertToJwk(it) }

    fun getAllKeys(): List<StoredKey> =
        rsaKeyRepository.findAllKeys().map { rsaKeyCryptoService.convertToStoredKey(it) }
}