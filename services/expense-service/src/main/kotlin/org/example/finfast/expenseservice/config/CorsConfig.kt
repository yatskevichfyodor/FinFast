package org.example.finfast.expenseservice.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
class CorsConfig(
    @Value("\${finfast.clientUrls}") private val clientUrls: String,
) {
    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val allowedOriginsList = clientUrls
            .split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }

        val configuration = CorsConfiguration().apply {
            allowedOrigins = allowedOriginsList
            allowedMethods = listOf(
                "GET",
                "POST",
                "PATCH",
                "DELETE",
                "OPTIONS"
            )
            allowedHeaders = listOf("*")
        }

        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", configuration)
        }
    }
}