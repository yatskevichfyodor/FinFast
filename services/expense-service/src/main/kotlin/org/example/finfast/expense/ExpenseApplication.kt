package org.example.finfast.expense

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.kafka.annotation.EnableKafka

@SpringBootApplication
@EnableKafka
class ExpenseApplication

fun main(args: Array<String>) {
    runApplication<ExpenseApplication>(*args)
}