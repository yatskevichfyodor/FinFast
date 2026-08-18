package org.example.org.example.finfast.repository

import org.example.org.example.finfast.entity.Expense
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ExpenseRepository : JpaRepository<Expense, UUID>