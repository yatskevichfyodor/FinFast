package org.example.finfast.auth.repository

import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import org.example.finfast.auth.entity.RefreshToken
import java.util.UUID

@ApplicationScoped
class RefreshTokenRepository : PanacheRepositoryBase<RefreshToken, UUID> {
    fun findByTokenHash(tokenHash: String): RefreshToken? = find("tokenHash", tokenHash).firstResult()

    fun save(token: RefreshToken): RefreshToken {
        persist(token)
        return token
    }

    fun deleteAllByUserId(userId: UUID) = delete("userId", userId)
}
