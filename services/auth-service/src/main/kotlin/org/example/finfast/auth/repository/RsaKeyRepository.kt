package org.example.finfast.auth.repository

import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import org.example.finfast.auth.entity.RsaKey
import java.time.Instant
import java.util.Optional
import java.util.UUID

@ApplicationScoped
class RsaKeyRepository @Inject constructor(private val em: EntityManager) {
    
    fun findByKeyId(keyId: String): RsaKey? {
        val q = em.createQuery("SELECT k FROM RsaKey k WHERE k.keyId = :keyId", RsaKey::class.java)
        q.setParameter("keyId", keyId)
        return q.resultList.firstOrNull()
    }
    
    fun findActiveKey(): RsaKey? {
        val q = em.createQuery("SELECT k FROM RsaKey k WHERE k.isActive = true ORDER BY k.createdAt DESC", RsaKey::class.java)
        return q.resultList.firstOrNull()
    }
    
    fun findAllActive(): List<RsaKey> {
        val q = em.createQuery("SELECT k FROM RsaKey k WHERE k.isActive = true", RsaKey::class.java)
        return q.resultList
    }
    
    fun findAll(): List<RsaKey> {
        val q = em.createQuery("SELECT k FROM RsaKey k ORDER BY k.createdAt DESC", RsaKey::class.java)
        return q.resultList
    }
    
    fun findInactiveKeysOlderThan(instant: Instant): List<RsaKey> {
        val q = em.createQuery(
            "SELECT k FROM RsaKey k WHERE k.isActive = false AND k.deactivatedAt < :instant", 
            RsaKey::class.java
        )
        q.setParameter("instant", instant)
        return q.resultList
    }
    
    @Transactional
    fun save(key: RsaKey): RsaKey {
        return if (em.contains(key)) key else em.merge(key)
    }
    
    @Transactional
    fun delete(key: RsaKey) {
        em.remove(if (em.contains(key)) key else em.merge(key))
    }
    
    @Transactional
    fun deactivateAllExcept(excludeKeyId: String) {
        val q = em.createQuery(
            "UPDATE RsaKey k SET k.isActive = false, k.deactivatedAt = :now WHERE k.keyId != :excludeKeyId AND k.isActive = true"
        )
        q.setParameter("now", Instant.now())
        q.setParameter("excludeKeyId", excludeKeyId)
        q.executeUpdate()
    }
    
    fun findById(id: UUID): Optional<RsaKey> = Optional.ofNullable(em.find(RsaKey::class.java, id))
}
