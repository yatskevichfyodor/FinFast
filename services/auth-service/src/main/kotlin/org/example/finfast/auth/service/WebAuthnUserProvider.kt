package org.example.finfast.auth.service

import io.quarkus.security.webauthn.WebAuthnCredentialRecord
import io.quarkus.security.webauthn.WebAuthnUserProvider
import io.smallrye.common.annotation.Blocking
import io.smallrye.mutiny.Uni
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import org.example.finfast.auth.entity.User
import org.example.finfast.auth.entity.WebAuthnCredential
import org.example.finfast.auth.repository.UserRepository
import org.example.finfast.auth.repository.WebAuthnCredentialRepository
import java.util.UUID

@Blocking
@ApplicationScoped
class WebAuthnUserProvider(
    private val repository: WebAuthnCredentialRepository,
    private val userRepository: UserRepository
) : WebAuthnUserProvider {

    @Transactional
    override fun findByUsername(
        username: String
    ): Uni<List<WebAuthnCredentialRecord>> {
        val credentials = repository.findByUsername(username)

        return Uni.createFrom().item(
            credentials.map(WebAuthnCredential::toRecord)
        )
    }

    @Transactional
    override fun findByCredentialId(
        credentialId: String
    ): Uni<WebAuthnCredentialRecord> {
        val credential = repository.findByCredentialId(credentialId)
            ?: return Uni.createFrom()
                .failure(
                    IllegalArgumentException(
                        "WebAuthn credential not found: $credentialId"
                    )
                )

        return Uni.createFrom().item(
            credential.toRecord()
        )
    }

    @Transactional
    override fun store(credentialRecord: WebAuthnCredentialRecord): Uni<Void> {
        val data = credentialRecord.requiredPersistedData
        if (userRepository.findByUsername(data.username) != null) {
            return Uni.createFrom().failure(IllegalArgumentException("Username is already taken"))
        }

        val user = userRepository.save(User(UUID.randomUUID(), data.username, null))
        repository.persist(
            WebAuthnCredential(
                id = UUID.randomUUID(),
                user = user,
                credentialId = data.credentialId,
                publicKey = data.publicKey,
                publicKeyAlgorithm = data.publicKeyAlgorithm,
                counter = data.counter,
                aaguid = data.aaguid
            )
        )
        return Uni.createFrom().voidItem()
    }

    @Transactional
    override fun update(credentialId: String, counter: Long): Uni<Void> {
        repository.findByCredentialId(credentialId)?.counter = counter
        return Uni.createFrom().voidItem()
    }

    override fun getRoles(username: String): Set<String> {
        return setOf("user")
    }
}