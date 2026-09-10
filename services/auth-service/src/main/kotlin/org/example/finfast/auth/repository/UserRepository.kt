package org.example.finfast.auth.repository

import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import org.example.finfast.auth.entity.User
import java.util.Optional
import java.util.UUID

@ApplicationScoped
class UserRepository @Inject constructor(private val em: EntityManager) {
    fun findByUsername(username: String): User? {
        val q = em.createQuery("SELECT u FROM User u WHERE u.username = :u", User::class.java)
        q.setParameter("u", username)
        return q.resultList.firstOrNull()
    }

    @Transactional
    fun save(user: User): User {
        em.persist(user)
        return user
    }

    fun findById(id: UUID): Optional<User> = Optional.ofNullable(em.find(User::class.java, id))
}