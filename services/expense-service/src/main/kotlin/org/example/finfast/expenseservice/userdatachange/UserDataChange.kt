package org.example.finfast.expenseservice.userdatachange

import jakarta.persistence.*
import java.io.Serializable
import java.time.Instant
import java.util.UUID

@Embeddable
data class UserDataChangeId(
    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 20)
    val dataType: UserDataType
) : Serializable

@Entity
@Table(name = "user_data_changes")
class UserDataChange(

    @EmbeddedId
    val id: UserDataChangeId,

    @Column(name = "changed_at", nullable = false)
    var changedAt: Instant
)

enum class UserDataType {
    EXPENSE,
    CATEGORY
}
