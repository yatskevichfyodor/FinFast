package org.example.finfast.auth.dto

import java.util.UUID

data class UserResponse(val id: UUID, val username: String, val email: String?, val googleLinked: Boolean, val hasPassword: Boolean)
