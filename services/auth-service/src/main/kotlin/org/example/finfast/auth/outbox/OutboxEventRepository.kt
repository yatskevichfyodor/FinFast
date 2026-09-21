package org.example.finfast.auth.outbox

import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import java.util.UUID

@ApplicationScoped
class OutboxEventRepository : PanacheRepositoryBase<OutboxEvent, UUID> {
    fun save(event: OutboxEvent): OutboxEvent {
        persist(event)
        return event
    }

    fun findPendingEvents(maxAttempts: Int): List<OutboxEvent> {
        return find(
            "status = ?1 or (status = ?2 and attempts < ?3) order by createdAt asc",
            OutboxEventStatus.NEW,
            OutboxEventStatus.FAILED,
            maxAttempts
        ).list()
    }

    fun markAsProcessing(event: OutboxEvent) {
        val managedEvent = findById(event.id)
        managedEvent?.let {
            it.status = OutboxEventStatus.PROCESSING
            it.attempts++
        }
    }

    fun markAsSent(event: OutboxEvent) {
        val managedEvent = findById(event.id)
        managedEvent?.let {
            it.status = OutboxEventStatus.SENT
            it.processedAt = java.time.Instant.now()
        }
    }

    fun markAsFailed(event: OutboxEvent) {
        val managedEvent = findById(event.id)
        managedEvent?.let {
            it.status = OutboxEventStatus.FAILED
        }
    }
}
