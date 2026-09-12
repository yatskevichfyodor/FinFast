package org.example.finfast.auth.outbox

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "outbox_events")
class OutboxEvent(
    @Id
    val id: UUID = UUID.randomUUID(),
    
    @Column(nullable = false)
    val eventType: String,
    
    @Column(name = "aggregate_id", nullable = false)
    val aggregateId: UUID,
    
    @Column(nullable = false, columnDefinition = "TEXT")
    val payload: String,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: OutboxEventStatus = OutboxEventStatus.NEW,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
    
    @Column(name = "processed_at")
    var processedAt: Instant? = null,
    
    @Column(nullable = false)
    var attempts: Int = 0
)
