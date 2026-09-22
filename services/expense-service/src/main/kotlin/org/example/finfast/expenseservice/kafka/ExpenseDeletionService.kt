package org.example.finfast.expenseservice.kafka

import org.example.finfast.expenseservice.expense.ExpenseRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ExpenseDeletionService(
    private val expenseRepository: ExpenseRepository
) {
    
    private val logger = LoggerFactory.getLogger(ExpenseDeletionService::class.java)
    
    @Transactional
    fun deleteExpensesForUser(userId: UUID) {
        logger.info("Deleting all expenses for user: $userId")
        
        val deletedCount = expenseRepository.deleteAllByExpenseId_UserId(userId)
        
        logger.info("Deleted $deletedCount expenses for user: $userId")
    }
}
