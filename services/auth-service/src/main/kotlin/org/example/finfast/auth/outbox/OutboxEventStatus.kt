package org.example.finfast.auth.outbox

enum class OutboxEventStatus {
    NEW,
    PROCESSING,
    SENT,
    FAILED
}
