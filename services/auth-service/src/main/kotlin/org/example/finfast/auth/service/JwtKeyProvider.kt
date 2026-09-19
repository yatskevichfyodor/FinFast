package org.example.finfast.auth.service

import jakarta.enterprise.context.ApplicationScoped
import java.security.KeyPair

@ApplicationScoped
class JwtKeyProvider(
    private val keyRotationService: KeyRotationService
) {
    val keyPair: KeyPair
        get() = keyRotationService.getActiveKey().keyPair
    
    val currentKeyId: String
        get() = keyRotationService.getActiveKey().keyId
}
