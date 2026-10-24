package org.example.finfast.auth.repository

import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import org.example.finfast.auth.entity.WebAuthnCredential
import java.util.UUID

@ApplicationScoped
class WebAuthnCredentialRepository : PanacheRepositoryBase<WebAuthnCredential, UUID> {
    fun findByUsername(username: String): List<WebAuthnCredential> =
        find("user.username", username).list()

    fun findByCredentialId(credentialId: String): WebAuthnCredential? =
        find("credentialId", credentialId).firstResult()

    fun existsByUserId(userId: UUID): Boolean =
        count("user.id", userId) > 0

    fun deleteAllByUserId(userId: UUID) =
        delete("user.id", userId)
}