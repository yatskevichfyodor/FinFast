package org.example.finfast.auth.entity

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
    var username: String,
    @Column(name = "password_hash")
    var passwordHash: String?,
    @Column(name = "google_subject", unique = true, length = 255)
    var googleSubject: String? = null,
    @Column(name = "google_email", length = 320)
    var googleEmail: String? = null
)
