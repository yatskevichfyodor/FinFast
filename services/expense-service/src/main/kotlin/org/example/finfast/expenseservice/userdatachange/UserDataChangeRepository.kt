package org.example.finfast.expenseservice.userdatachange

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface UserDataChangeRepository : JpaRepository<UserDataChange, UserDataChangeId> {
    fun findAllByIdUserId(userId: UUID): List<UserDataChange>

    @Modifying
    @Query(value = """
        INSERT INTO user_data_changes (user_id, data_type, changed_at) 
        VALUES (:userId, :dataType, :changedAt)
        ON CONFLICT (user_id, data_type)
        DO UPDATE SET changed_at = EXCLUDED.changed_at 
    """, nativeQuery = true) fun saveTimestamp(
        @Param("userId") userId: UUID,
        @Param("dataType") dataType: String,
        @Param("changedAt") changedAt: Instant
    )
}
