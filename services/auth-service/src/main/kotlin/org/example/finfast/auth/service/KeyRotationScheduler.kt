package org.example.finfast.auth.service

import io.quarkus.runtime.StartupEvent
import io.quarkus.scheduler.Scheduled
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.Observes

@ApplicationScoped
class KeyRotationScheduler(
    private val rsaKeyRotationService: RsaKeyRotationService
) {
    fun onStart(@Observes event: StartupEvent) {
        rsaKeyRotationService.initializeKeys()
        rsaKeyRotationService.checkAndPerformRotationIfNeeded()
    }

    @Scheduled(every = "{finfast.jwt.rotation-interval}")
    fun onRotationSchedule() {
        rsaKeyRotationService.rotateKeys()
    }
}