package org.example.finfast.auth.repository

import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import org.example.finfast.auth.entity.RefreshToken

@ApplicationScoped
class RefreshTokenRepository @Inject constructor(private val em: EntityManager) {
    fun findByTokenHash(tokenHash: String): RefreshToken? {
        val q = em.createQuery("SELECT r FROM RefreshToken r WHERE r.tokenHash = :h", RefreshToken::class.java)
        q.setParameter("h", tokenHash)
        return q.resultList.firstOrNull()
    }

    @Transactional
    fun save(token: RefreshToken): RefreshToken {
        em.persist(token)
        return token
    }
}
