package org.example.finfast.expenseservice.userdatachange

import java.time.Instant

data class UserDataChangeResponse(
    val dataType: UserDataType,
    val changedAt: Instant)
{
    companion object {
        fun from(change: UserDataChange) =
            UserDataChangeResponse(dataType = change.id.dataType, changedAt = change.changedAt)
    }
}