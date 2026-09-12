package org.example.finfast.auth.outbox

import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional

@ApplicationScoped
class OutboxEventRepository @Inject constructor(private val em: EntityManager) {
    
    @Transactional
    fun save(event: OutboxEvent): OutboxEvent {
        em.persist(event)
        return event
    }
    
    fun findPendingEvents(maxAttempts: Int): List<OutboxEvent> {
        val query = em.createQuery(
            """
            SELECT e FROM OutboxEvent e 
            WHERE e.status = :newStatus 
            OR (e.status = :failedStatus AND e.attempts < :maxAttempts)
            ORDER BY e.createdAt ASC
            """, OutboxEvent::class.java
        )
        query.setParameter("newStatus", OutboxEventStatus.NEW)
        query.setParameter("failedStatus", OutboxEventStatus.FAILED)
        query.setParameter("maxAttempts", maxAttempts)
        return query.resultList
    }
    
    @Transactional
    fun markAsProcessing(event: OutboxEvent) {
        val managedEvent = em.find(OutboxEvent::class.java, event.id)
        managedEvent?.let {
            it.status = OutboxEventStatus.PROCESSING
            it.attempts++
        }
    }
    
    @Transactional
    fun markAsSent(event: OutboxEvent) {
        val managedEvent = em.find(OutboxEvent::class.java, event.id)
        managedEvent?.let {
            it.status = OutboxEventStatus.SENT
            it.processedAt = java.time.Instant.now()
        }
    }
    
    @Transactional
    fun markAsFailed(event: OutboxEvent) {
        val managedEvent = em.find(OutboxEvent::class.java, event.id)
        managedEvent?.let {
            it.status = OutboxEventStatus.FAILED
        }
    }
}
