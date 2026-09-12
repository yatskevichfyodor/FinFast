package org.example.finfast.auth.outbox

import io.smallrye.config.ConfigMapping
import io.smallrye.config.WithDefault
import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import jakarta.transaction.Transactional
import org.eclipse.microprofile.reactive.messaging.Channel
import org.eclipse.microprofile.reactive.messaging.Emitter
import org.slf4j.LoggerFactory
import java.util.UUID

@ApplicationScoped
class OutboxEventPublisher @Inject constructor(
    private val outboxEventRepository: OutboxEventRepository,
    @Channel("user-events-out")
    private val userEventsEmitter: Emitter<String>,
    private val config: OutboxConfig
) {
    
    private val logger = LoggerFactory.getLogger(OutboxEventPublisher::class.java)
    
    fun processPendingEvents() {
        val pendingEvents = outboxEventRepository.findPendingEvents(config.maxAttempts())
        
        pendingEvents.forEach { event ->
            try {
                processEvent(event)
            } catch (e: Exception) {
                logger.error("Failed to process outbox event ${event.id}", e)
                outboxEventRepository.markAsFailed(event)
            }
        }
    }
    
    @Transactional
    fun processEvent(event: OutboxEvent) {
        outboxEventRepository.markAsProcessing(event)
        
        when (event.eventType) {
            "USER_DELETED" -> handleUserDeleted(event)
            else -> {
                logger.warn("Unknown event type: ${event.eventType}")
                outboxEventRepository.markAsFailed(event)
            }
        }
    }
    
    private fun handleUserDeleted(event: OutboxEvent) {
        try {
            userEventsEmitter.send(event.payload)
            outboxEventRepository.markAsSent(event)
            logger.info("Successfully sent USER_DELETED event for user ${event.aggregateId}")
        } catch (e: Exception) {
            logger.error("Error sending USER_DELETED event to Kafka", e)
            outboxEventRepository.markAsFailed(event)
        }
    }
    
    @Transactional
    fun createOutboxEvent(eventType: String, aggregateId: UUID, payload: String): OutboxEvent {
        val event = OutboxEvent(
            eventType = eventType,
            aggregateId = aggregateId,
            payload = payload
        )
        return outboxEventRepository.save(event)
    }
}

@ConfigMapping(prefix = "finfast.outbox")
interface OutboxConfig {
    @WithDefault("5")
    fun maxAttempts(): Int
}
