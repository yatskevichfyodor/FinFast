package org.example.finfast.expenseservice.userdatachange

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class UserDataChangeService(
    private val repository: UserDataChangeRepository
) {

    @Transactional(readOnly = true)
    fun getChanges(userId: UUID): List<UserDataChange> {
        return repository.findAllByIdUserId(userId)
    }

    fun saveTimestamp(
        userId: UUID,
        dataType: UserDataType
    ) {
        repository.saveTimestamp(userId, dataType.toString(), Instant.now())
    }
}
