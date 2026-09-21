package org.example.finfast.auth.repository

import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import org.example.finfast.auth.entity.RsaKey
import java.time.Instant
import java.util.Optional
import java.util.UUID

@ApplicationScoped
class RsaKeyRepository : PanacheRepositoryBase<RsaKey, UUID> {
    fun findByKeyId(keyId: String): RsaKey? = find("keyId", keyId).firstResult()

    fun findActiveKey(): RsaKey? = find("isActive = true order by createdAt desc").firstResult()

    fun findAllActive(): List<RsaKey> = find("isActive", true).list()

    fun findAllKeys(): List<RsaKey> = find("order by createdAt desc").list()

    fun findInactiveKeysOlderThan(instant: Instant): List<RsaKey> =
        find("isActive = false and deactivatedAt < ?1", instant).list()

    fun save(key: RsaKey): RsaKey =
        if (findById(key.id) == null) {
            persist(key)
            key
        } else {
            getEntityManager().merge(key)
        }

    fun deactivateAllExcept(excludeKeyId: String) {
        update(
            "isActive = false, deactivatedAt = ?1 where keyId != ?2 and isActive = true",
            Instant.now(),
            excludeKeyId
        )
    }

    fun findByIdOptional(id: UUID): Optional<RsaKey> = Optional.ofNullable(findById(id))
}
