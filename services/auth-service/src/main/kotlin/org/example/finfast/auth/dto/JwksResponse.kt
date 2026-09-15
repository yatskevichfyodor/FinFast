package org.example.finfast.auth.dto

data class JwksResponse(
    val keys: List<Jwk>
)

data class Jwk(
    val kty: String, // Key Type (e.g., "RSA")
    val kid: String, // Key ID
    val use: String, // Public Key Use (e.g., "sig")
    val alg: String, // Algorithm (e.g., "RS256")
    val n: String,   // Modulus
    val e: String    // Exponent
)
