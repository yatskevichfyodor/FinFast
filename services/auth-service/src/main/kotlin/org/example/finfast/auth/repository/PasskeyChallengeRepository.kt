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
    fun consume(
        id: UUID,
        challenge: String,
        purpose: String,
        subject: String,
        username: String?
    ): Boolean {
        val now = Instant.now()
        val query = if (username == null) {
            "id = ?1 and challenge = ?2 and purpose = ?3 and subject = ?4 and expiresAt > ?5 and username is null"
        } else {
            "id = ?1 and challenge = ?2 and purpose = ?3 and subject = ?4 and expiresAt > ?5 and username = ?6"
        }
        return if (username == null) {
            delete(query, id, challenge, purpose, subject, now) == 1L
        } else {
            delete(query, id, challenge, purpose, subject, now, username) == 1L
        }
    }

    @Transactional
    fun deleteExpired() {
        delete("expiresAt <= ?1", Instant.now())
    }
}