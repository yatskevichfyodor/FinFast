package org.example.finfast.expenseservice

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.temporal.ChronoUnit

@Component
class ExpensePurgeScheduler(
    private val expenseService: ExpenseService
) {
    private val logger = LoggerFactory.getLogger(ExpensePurgeScheduler::class.java)

    @Scheduled(cron = "\${finfast.expense.purge.cron:0 0 3 * * *}")
    fun purgeExpiredDeletedExpenses() {
        val retentionDays = 365L
        val before = Instant.now().minus(retentionDays, ChronoUnit.DAYS)
        val deletedCount = expenseService.purgeExpiredDeleted(before)

        if (deletedCount > 0) {
            logger.info("Purged $deletedCount expenses deleted before $before")
        }
    }
}
