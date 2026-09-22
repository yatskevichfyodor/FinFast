package org.example.finfast.expenseservice

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class ExpenseApplication

fun main(args: Array<String>) {
    runApplication<ExpenseApplication>(*args)
}