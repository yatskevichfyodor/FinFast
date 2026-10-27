package org.example.finfast.auth.repository

import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import org.example.finfast.auth.entity.PasskeyChallenge
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class PasskeyChallengeRepository : PanacheRepositoryBase<PasskeyChallenge, UUID> {
    @Transactional
    fun consume(id: UUID): Boolean =
        delete("id = ?1 and expiresAt > ?2", id, Instant.now()) == 1L

    @Transactional
    fun deleteExpired() {
        delete("expiresAt <= ?1", Instant.now())
    }
}