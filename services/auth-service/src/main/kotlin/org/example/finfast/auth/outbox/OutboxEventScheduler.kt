package org.example.finfast.auth.outbox

import io.quarkus.arc.properties.IfBuildProperty
import io.quarkus.scheduler.Scheduled
import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import org.slf4j.LoggerFactory

@ApplicationScoped
@IfBuildProperty(
    name = "finfast.outbox.enabled",
    stringValue = "true",
)
class OutboxEventScheduler @Inject constructor(
    private val outboxEventPublisher: OutboxEventPublisher
) {
    
    private val logger = LoggerFactory.getLogger(OutboxEventScheduler::class.java)
    
    @Scheduled(every = "30s", delayed = "30s")
    fun processOutboxEvents() {
        logger.debug("Processing pending outbox events")
        try {
            outboxEventPublisher.processPendingEvents()
        } catch (e: Exception) {
            logger.error("Error processing outbox events", e)
        }
    }
}
