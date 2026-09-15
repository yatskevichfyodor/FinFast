package org.example.finfast.auth.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "rsa_keys")
class RsaKey(
    @Id
    val id: UUID,
    
    @Column(name = "key_id", nullable = false, unique = true, length = 100)
    val keyId: String,
    
    @Column(name = "private_key", nullable = false, columnDefinition = "TEXT")
    val privateKey: String,
    
    @Column(name = "public_key", nullable = false, columnDefinition = "TEXT")
    val publicKey: String,
    
    @Column(name = "is_active", nullable = false)
    val isActive: Boolean,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant,
    
    @Column(name = "deactivated_at")
    var deactivatedAt: Instant? = null
)
