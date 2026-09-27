package org.example.finfast.expenseservice.category

import org.example.finfast.expenseservice.InvalidCategoryException

enum class SystemCategory(val id: String) {
    FOOD("food"),
    TRANSPORT("transport"),
    HOME("home"),
    CLOTHES("clothes"),
    SHOPPING("shopping"),
    ENTERTAINMENT("entertainment"),
    HEALTH("health"),
    SUBSCRIPTIONS("subscriptions");

    companion object {
        fun isValid(id: String): Boolean = entries.any { it.id.equals(id, ignoreCase = true) }
        fun normalize(id: String): String = entries.firstOrNull { it.id.equals(id, ignoreCase = true) }?.id
            ?: throw InvalidCategoryException("Unknown system category: $id")
    }
}