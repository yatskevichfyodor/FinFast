package org.example.org.example.finfast.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "users")
class User(
    @Id
    val id: UUID,
    @Column(nullable = false, unique = true, length = 100)
    val username: String,
    @Column(name = "password_hash", nullable = false)
    val passwordHash: String
)