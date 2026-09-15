package org.example.finfast.auth.resource

import jakarta.ws.rs.ext.ExceptionMapper
import jakarta.ws.rs.ext.Provider
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response

data class ErrorResponse(val message: String)

@Provider
class AuthExceptionMapper : ExceptionMapper<IllegalArgumentException> {
    override fun toResponse(exception: IllegalArgumentException): Response {
        val message = exception.message ?: "Invalid request"
        val status = when {
            message == "User not found" -> Response.Status.NOT_FOUND
            message.startsWith("Invalid refresh token") ||
                message.startsWith("Refresh token") -> Response.Status.UNAUTHORIZED
            else -> Response.Status.BAD_REQUEST
        }

        return Response.status(status)
            .type(MediaType.APPLICATION_JSON)
            .entity(ErrorResponse(message))
            .build()
    }
}