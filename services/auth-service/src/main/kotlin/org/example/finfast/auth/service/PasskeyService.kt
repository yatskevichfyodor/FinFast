package org.example.finfast.auth.service

import io.quarkus.security.webauthn.WebAuthnCredentialRecord
import io.quarkus.security.webauthn.WebAuthnLoginResponse
import io.quarkus.security.webauthn.WebAuthnRegisterResponse
import io.quarkus.security.webauthn.WebAuthnSecurity
import io.vertx.ext.web.RoutingContext
import com.webauthn4j.data.PublicKeyCredentialParameters
import com.webauthn4j.data.PublicKeyCredentialType
import com.webauthn4j.data.RegistrationParameters
import com.webauthn4j.data.AuthenticationParameters
import com.webauthn4j.data.attestation.statement.COSEAlgorithmIdentifier
import com.webauthn4j.data.client.Origin
import com.webauthn4j.data.client.challenge.DefaultChallenge
import com.webauthn4j.server.ServerProperty
import io.vertx.core.json.JsonObject
import com.webauthn4j.util.Base64UrlUtil
import org.eclipse.microprofile.config.inject.ConfigProperty
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.WebApplicationException
import org.example.finfast.auth.entity.User
import org.example.finfast.auth.entity.WebAuthnCredential
import org.example.finfast.auth.entity.PasskeyChallenge
import org.example.finfast.auth.dto.TokenResponse
import org.example.finfast.auth.repository.UserRepository
import org.example.finfast.auth.repository.WebAuthnCredentialRepository
import org.example.finfast.auth.repository.PasskeyChallengeRepository
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class PasskeyService(
    private val userRepository: UserRepository,
    private val credentialRepository: WebAuthnCredentialRepository,
    private val webAuthnSecurity: WebAuthnSecurity,
    private val authService: AuthService,
    private val challengeRepository: PasskeyChallengeRepository,
    @ConfigProperty(name = "quarkus.webauthn.relying-party.id")
    private val relyingPartyId: String,
) {
    @Transactional
    fun createLinkOptions(userId: UUID, displayName: String?, routingContext: RoutingContext): JsonObject {
        val user = getUserById(userId)
        val options = webAuthnSecurity.getRegisterChallenge(
            user.username,
            displayName?.takeIf { it.isNotBlank() } ?: user.username,
            routingContext
        ).await().indefinitely()
        val optionsJson = JsonObject(webAuthnSecurity.toJsonString(options))
        val challenge = optionsJson.getString("challenge")
            ?: throw IllegalStateException("WebAuthn challenge was not generated")
        optionsJson.put("challengeId", issueChallenge("link", user.id.toString(), user.username, challenge))
        return optionsJson
    }

    @Transactional
    fun createRegistrationOptions(username: String, displayName: String?, routingContext: RoutingContext): JsonObject {
        val normalizedUsername = username.trim()
        if (normalizedUsername.isBlank() || normalizedUsername.length > 100) {
            throw WebApplicationException("Username must contain between 1 and 100 characters", 400)
        }
        if (userRepository.existsByUsername(normalizedUsername)) {
            throw WebApplicationException("Username already exists", 409)
        }
        val options = webAuthnSecurity.getRegisterChallenge(
            normalizedUsername,
            displayName?.takeIf { it.isNotBlank() } ?: normalizedUsername,
            routingContext
        ).await().indefinitely()
        val json = JsonObject(webAuthnSecurity.toJsonString(options))
        val challenge = json.getString("challenge")
            ?: throw IllegalStateException("WebAuthn challenge was not generated")
        json.put(
            "challengeId",
            issueChallenge("register", normalizedUsername, normalizedUsername, challenge)
        )
        return json
    }

    @Transactional
    fun createLoginOptions(username: String?, routingContext: RoutingContext): JsonObject {
        val normalizedUsername = username?.trim()?.takeIf { it.isNotBlank() }
        val options = webAuthnSecurity.getLoginChallenge(normalizedUsername ?: "", routingContext)
            .await().indefinitely()
        val json = JsonObject(webAuthnSecurity.toJsonString(options))
        val challenge = json.getString("challenge")
            ?: throw IllegalStateException("WebAuthn challenge was not generated")
        json.put(
            "challengeId",
            issueChallenge("login", normalizedUsername ?: "discoverable", normalizedUsername, challenge)
        )
        return json
    }

    @Transactional
    fun linkPasskey(
        userId: UUID,
        userRegisterResponse: WebAuthnRegisterResponse,
        challengeId: UUID,
        challenge: String,
        routingContext: RoutingContext
    ) {
        val user = getUserById(userId)
        if (!userRegisterResponse.isSet || !userRegisterResponse.isValid) {
            throw WebApplicationException("Invalid passkey registration response", 400)
        }

        val savedChallenge = requireChallenge(challengeId, challenge, "link", user.id.toString(), user.username)
        val credentialRecord = verifyRegistration(
            user.username, userRegisterResponse, savedChallenge.challenge, routingContext
        )
        if (!challengeRepository.consume(
                savedChallenge.id, savedChallenge.challenge, savedChallenge.purpose,
                savedChallenge.subject, savedChallenge.username
            )
        ) {
            throw WebApplicationException("Passkey challenge was already used or expired", 400)
        }

        if (credentialRecord.requiredPersistedData.username != user.username) {
            throw WebApplicationException("Passkey registration identity does not match the account", 400)
        }
        saveCredential(user.id, credentialRecord)
    }

    @Transactional
    fun unlinkPasskey(userId: UUID): PasskeyUnlinkResult {
        val user = getUserById(userId)
        if (user.passwordHash == null && user.googleSubject == null) {
            throw WebApplicationException(
                "Нельзя отвязать passkey: сначала добавьте пароль или привяжите Google",
                409
            )
        }
        val credentialIds = credentialRepository.findByUserId(user.id).map { it.credentialId }
        credentialRepository.deleteAllByUserId(user.id)
        return PasskeyUnlinkResult(relyingPartyId, credentialIds)
    }

    @Transactional
    fun registerUser(
        username: String,
        userRegisterResponse: WebAuthnRegisterResponse,
        challengeId: UUID,
        challenge: String,
        routingContext: RoutingContext
    ): TokenResponse {
        if (!userRegisterResponse.isSet || !userRegisterResponse.isValid) {
            throw WebApplicationException("Invalid passkey registration response", 400)
        }
        val normalizedUsername = username.trim()
        if (normalizedUsername.isBlank() || normalizedUsername.length > 100) {
            throw WebApplicationException("Username must contain between 1 and 100 characters", 400)
        }
        if (userRepository.existsByUsername(normalizedUsername)) throw WebApplicationException("Username already exists", 409)

        val savedChallenge = requireChallenge(
            challengeId, challenge, "register", normalizedUsername, normalizedUsername
        )
        val credentialRecord = verifyRegistration(
            normalizedUsername, userRegisterResponse, savedChallenge.challenge, routingContext
        )
        if (!challengeRepository.consume(
                savedChallenge.id, savedChallenge.challenge, savedChallenge.purpose,
                savedChallenge.subject, savedChallenge.username
            )
        ) {
            throw WebApplicationException("Passkey challenge was already used or expired", 400)
        }

        if (credentialRecord.requiredPersistedData.username != normalizedUsername) {
            throw WebApplicationException("Passkey registration identity does not match the account", 400)
        }

        val user = userRepository.save(
            User(
                id = UUID.randomUUID(),
                username = normalizedUsername,
                passwordHash = null
            )
        )

        saveCredential(user.id, credentialRecord)
        return authService.issueTokens(user)
    }

    @Transactional
    fun login(
        username: String?,
        challengeId: UUID,
        challenge: String,
        userLoginResponse: WebAuthnLoginResponse,
        routingContext: RoutingContext
    ): TokenResponse {
        if (!userLoginResponse.isSet || !userLoginResponse.isValid) {
            throw WebApplicationException("Invalid passkey response", 400)
        }
        val normalizedUsername = username?.trim()?.takeIf { it.isNotBlank() }
        val challengeSubject = normalizedUsername ?: "discoverable"
        val savedChallenge = requireChallenge(challengeId, challenge, "login", challengeSubject, normalizedUsername)
        val credential = credentialRepository.findByCredentialId(userLoginResponse.webAuthnRawId)
            ?: throw WebApplicationException("Passkey credential not found", 401)
        if (normalizedUsername != null && credential.user.username != normalizedUsername) {
            throw WebApplicationException("Passkey does not belong to the requested user", 401)
        }

        val serverProperty = ServerProperty(
            webAuthnSecurity.getAllowedOrigins(routingContext).map(Origin::create).toSet(),
            relyingPartyId,
            DefaultChallenge(savedChallenge.challenge),
            null
        )
        val responseJson = userLoginResponse.toJsonObject()
        val authenticationParameters = AuthenticationParameters(
            serverProperty,
            credential.toRecord(),
            listOf(Base64UrlUtil.decode(userLoginResponse.webAuthnRawId)),
            true,
            true
        )
        val authenticationData = try {
            webAuthnSecurity.getWebAuthn4J()
                .verifyAuthenticationResponseJSON(responseJson.encode(), authenticationParameters)
                .toCompletableFuture()
                .get()
        } catch (exception: Exception) {
            throw WebApplicationException("Passkey authentication failed", exception, 401)
        }
        if (!challengeRepository.consume(
            savedChallenge.id, savedChallenge.challenge, savedChallenge.purpose,
            savedChallenge.subject, savedChallenge.username
            )
        ) {
            throw WebApplicationException("Passkey challenge was already used or expired", 401)
        }
        credential.counter = authenticationData.authenticatorData?.signCount?.toLong()
            ?: throw WebApplicationException("Passkey authenticator data is missing", 401)
        return authService.issueTokens(credential.user)
    }

    private fun issueChallenge(purpose: String, subject: String, username: String?, challenge: String): UUID {
        challengeRepository.deleteExpired()
        val challengeId = UUID.randomUUID()
        challengeRepository.persist(
            PasskeyChallenge(
                challengeId,
                challenge,
                purpose,
                subject,
                username,
                Instant.now().plusSeconds(300)
            )
        )
        return challengeId
    }

    private fun requireChallenge(
        id: UUID,
        submittedChallenge: String,
        purpose: String,
        subject: String,
        username: String?
    ): PasskeyChallenge {
        val record = challengeRepository.findById(id) ?: throw WebApplicationException("Passkey challenge is missing or expired", 400)
        if (record.expiresAt <= Instant.now() || record.challenge != submittedChallenge ||
            record.purpose != purpose || record.subject != subject || record.username != username
        ) {
            throw WebApplicationException("Passkey challenge is invalid or expired", 400)
        }
        return record
    }

    private fun verifyRegistration(
        username: String,
        response: WebAuthnRegisterResponse,
        challenge: String,
        routingContext: RoutingContext
    ): WebAuthnCredentialRecord {
        if (!response.isSet || !response.isValid) {
            throw WebApplicationException("Invalid passkey registration response", 400)
        }
        val serverProperty = ServerProperty(
            webAuthnSecurity.getAllowedOrigins(routingContext).map(Origin::create).toSet(),
            relyingPartyId,
            DefaultChallenge(challenge),
            null
        )
        val parameters = RegistrationParameters(
            serverProperty,
            listOf(
                PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.ES256),
                PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.RS256)
            ),
            true,
            true
        )
        val data = try {
            webAuthnSecurity.getWebAuthn4J()
                .verifyRegistrationResponseJSON(response.toJsonObject().encode(), parameters)
                .toCompletableFuture()
                .get()
        } catch (exception: Exception) {
            throw WebApplicationException("Passkey registration verification failed", exception, 400)
        }
        return WebAuthnCredentialRecord(
            username,
            data.attestationObject,
            data.collectedClientData,
            data.clientExtensions,
            data.transports
        )
    }

    private fun getUserById(userId: UUID): User {
        return userRepository.findByIdOptional(userId).orElseThrow { WebApplicationException("User not found", 404) }
    }

    private fun saveCredential(userId: UUID, record: WebAuthnCredentialRecord) {
        val data = record.requiredPersistedData
        if (credentialRepository.findByCredentialId(data.credentialId) != null) {
            throw WebApplicationException("Passkey is already linked", 409)
        }
        val user = userRepository.findByIdOptional(userId).orElseThrow()
        credentialRepository.persist(
            WebAuthnCredential(
                user = user,
                credentialId = data.credentialId,
                publicKey = data.publicKey,
                publicKeyAlgorithm = data.publicKeyAlgorithm,
                counter = data.counter,
                aaguid = data.aaguid
            )
        )
    }

}

data class PasskeyUnlinkResult(
    val rpId: String,
    val credentialIds: List<String>,
)