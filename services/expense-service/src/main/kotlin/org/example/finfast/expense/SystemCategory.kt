package org.example.finfast.expense

enum class SystemCategory(val id: String, val displayName: String, val icon: String, val color: String) {
    FOOD("food", "Еда", "mdi-food", "#FF7043"),
    TRANSPORT("transport", "Транспорт", "mdi-car", "#42A5F5"),
    HOME("home", "Дом", "mdi-home", "#AB47BC"),
    SHOPPING("shopping", "Покупки", "mdi-shopping", "#EC407A"),
    ENTERTAINMENT("entertainment", "Развлечения", "mdi-gamepad-variant", "#7E57C2"),
    HEALTH("health", "Здоровье", "mdi-heart-pulse", "#26A69A"),
    SUBSCRIPTIONS("subscriptions", "Подписки", "mdi-calendar-check", "#FFCA28"),
    OTHER("other", "Другое", "mdi-dots-horizontal-circle", "#78909C");

    companion object {
        fun isValid(id: String): Boolean = entries.any { it.id.equals(id, ignoreCase = true) }
        fun normalize(id: String): String = entries.firstOrNull { it.id.equals(id, ignoreCase = true) }?.id
            ?: throw InvalidCategoryException("Unknown system category: $id")
    }
}