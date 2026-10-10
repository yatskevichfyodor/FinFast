package org.example.finfast.auth.dto

import org.example.finfast.auth.entity.User
import java.util.UUID

data class UserResponse(
    val id: UUID,
    val username: String,
    val email: String?,
    val googleLinked: Boolean,
    val hasPassword: Boolean,
    val passkeyLinked: Boolean = false
) {
    companion object {
        fun fromUser(user: User, passkeyLinked: Boolean = false): UserResponse = UserResponse(
            user.id,
            user.username,
            user.googleEmail,
            user.googleSubject != null,
            user.passwordHash != null,
            passkeyLinked
        )
    }
}


