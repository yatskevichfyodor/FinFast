package org.example.finfast.auth.outbox

import io.smallrye.config.ConfigMapping
import io.smallrye.config.WithDefault

@ConfigMapping(prefix = "finfast.outbox")
interface OutboxConfig {
    @WithDefault("true")
    fun enabled(): Boolean
    @WithDefault("5")
    fun maxAttempts(): Int
}