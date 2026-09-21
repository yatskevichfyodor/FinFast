package org.example.finfast.auth.repository

import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import org.example.finfast.auth.entity.User
import java.util.Optional
import java.util.UUID

@ApplicationScoped
class UserRepository : PanacheRepositoryBase<User, UUID> {
    fun findByUsername(username: String): User? = find("username", username).firstResult()

    fun findByGoogleSubject(subject: String): User? = find("googleSubject", subject).firstResult()

    fun save(user: User): User =
        if (findById(user.id) == null) {
            persist(user)
            user
        } else {
            getEntityManager().merge(user)
        }

    fun findByIdOptional(id: UUID): Optional<User> = Optional.ofNullable(findById(id))

    fun deleteUser(user: User) = delete(user)
}
