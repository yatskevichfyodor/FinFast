package org.example.finfast.auth.config

import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import org.example.finfast.auth.KeyRotationService
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
