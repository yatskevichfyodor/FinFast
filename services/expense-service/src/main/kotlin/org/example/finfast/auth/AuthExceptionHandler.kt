package org.example.finfast.auth

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class AuthExceptionHandler {

    private val logger = LoggerFactory.getLogger(AuthExceptionHandler::class.java)

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentialsException(ex: BadCredentialsException): ResponseEntity<Map<String, String>> {
        // Log as WARN, not ERROR, since invalid credentials are expected client errors
        logger.debug("Authentication failed: ${ex.message}")
        
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(mapOf("error" to (ex.message ?: "Invalid credentials")))
    }
}
