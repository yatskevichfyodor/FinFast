package org.example.finfast.auth.entity

import jakarta.persistence.*
import java.util.*

@Entity
@Table(
    name = "webauthn_credentials",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_webauthn_credentials_credential_id",
            columnNames = ["credential_id"]
        )
    ]
)
class WebAuthnCredential(

    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        foreignKey = ForeignKey(name = "fk_webauthn_credentials_user")
    )
    val user: User,

    @Column(name = "credential_id", nullable = false)
    val credentialId: String,

    @Column(name = "public_key", nullable = false)
    val publicKey: ByteArray,

    @Column(name = "public_key_algorithm", nullable = false)
    val publicKeyAlgorithm: Long,

    @Column(nullable = false)
    var counter: Long,

    @Column(name = "aaguid", nullable = false)
    val aaguid: UUID
) {
    fun toRecord(): io.quarkus.security.webauthn.WebAuthnCredentialRecord =
        io.quarkus.security.webauthn.WebAuthnCredentialRecord.fromRequiredPersistedData(
            io.quarkus.security.webauthn.WebAuthnCredentialRecord.RequiredPersistedData(
                user.username,
                credentialId,
                aaguid,
                publicKey,
                publicKeyAlgorithm,
                counter
            )
        )
}