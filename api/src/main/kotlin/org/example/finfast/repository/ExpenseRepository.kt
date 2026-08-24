package org.example.org.example.finfast.repository

import org.example.org.example.finfast.entity.Expense
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ExpenseRepository : JpaRepository<Expense, UUID> {
    fun findByIdAndUserId(id: UUID, userId: UUID): Expense?
    fun findAllByIdInAndUserId(ids: Collection<UUID>, userId: UUID): List<Expense>
    fun existsByIdAndUserId(id: UUID, userId: UUID): Boolean
    fun deleteByIdAndUserId(id: UUID, userId: UUID): Long
    fun deleteAllByIdInAndUserId(ids: Collection<UUID>, userId: UUID): Long
}