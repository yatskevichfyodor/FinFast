package org.example.finfast.expense.kafka

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class UserDeletedEventConsumer(
    private val expenseDeletionService: ExpenseDeletionService
) {
    
    private val logger = LoggerFactory.getLogger(UserDeletedEventConsumer::class.java)
    private val objectMapper = jacksonObjectMapper()
    
    @KafkaListener(
        topics = ["user-events"],
        groupId = "expense-service"
    )
    @Transactional
    fun handleUserDeletedEvent(message: String) {
        try {
            logger.info("Received user event: $message")
            
            val event = objectMapper.readTree(message)
            val eventType = event.get("eventType").asText()
            
            if (eventType == "USER_DELETED") {
                val userId = UUID.fromString(event.get("userId").asText())
                logger.info("Processing USER_DELETED event for user: $userId")
                
                expenseDeletionService.deleteExpensesForUser(userId)
                logger.info("Successfully deleted expenses for user: $userId")
            } else {
                logger.debug("Ignoring event type: $eventType")
            }
        } catch (e: Exception) {
            logger.error("Error processing user event", e)
            // Re-throw to trigger Kafka retry mechanism
            throw e
        }
    }
}
