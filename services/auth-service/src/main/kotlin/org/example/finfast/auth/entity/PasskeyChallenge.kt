package org.example.finfast.auth.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "passkey_challenges")
class PasskeyChallenge(
    @Id
    val id: UUID,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant
)