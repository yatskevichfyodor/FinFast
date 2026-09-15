package org.example.finfast.expense.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.web.SecurityFilterChain

@Configuration
class SecurityConfig(
    @Value("\${finfast.auth-service.url}") private val authServiceUrl: String,
    @Value("\${finfast.jwt.issuer}") private val issuer: String
) {
    @Bean
    fun jwtDecoder(): JwtDecoder {
        val jwksUri = "$authServiceUrl/auth/.well-known/jwks.json"
        val decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build()
        
        // Set custom validator to check issuer
        decoder.setJwtValidator(
            org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator(
                org.springframework.security.oauth2.jwt.JwtValidators.createDefaultWithIssuer(issuer)
            )
        )
        
        return decoder
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { }
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { it.anyRequest().authenticated() }
            .headers { it.frameOptions { frame -> frame.disable() } }
            .oauth2ResourceServer { it.jwt { } }

        return http.build()
    }
}
