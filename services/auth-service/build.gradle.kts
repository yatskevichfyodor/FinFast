plugins {
    kotlin("jvm") version "2.4.10"
    kotlin("plugin.allopen") version "2.4.10"
    kotlin("plugin.noarg") version "2.4.10"
    id("io.quarkus")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

val quarkusPlatformGroupId: String = providers.gradleProperty("quarkusPlatformGroupId").get()
val quarkusPlatformArtifactId: String = providers.gradleProperty("quarkusPlatformArtifactId").get()
val quarkusPlatformVersion: String = providers.gradleProperty("quarkusPlatformVersion").get()

dependencies {
    implementation(enforcedPlatform("${quarkusPlatformGroupId}:${quarkusPlatformArtifactId}:${quarkusPlatformVersion}"))

    implementation("io.quarkus:quarkus-rest")
    implementation("io.quarkus:quarkus-rest-jackson")
    implementation("io.quarkus:quarkus-hibernate-orm")
    implementation("io.quarkus:quarkus-flyway")
    implementation("io.quarkus:quarkus-config-yaml")
    implementation("io.quarkus:quarkus-jdbc-postgresql")
    implementation("io.quarkus:quarkus-arc")
    implementation("io.quarkus:quarkus-kotlin")
    implementation("io.quarkus:quarkus-elytron-security-common")
    implementation("com.nimbusds:nimbus-jose-jwt:10.9.1")

    testImplementation("io.quarkus:quarkus-junit")
    testImplementation("io.rest-assured:rest-assured")
}

allOpen {
    annotation("jakarta.ws.rs.Path")
    annotation("jakarta.enterprise.context.ApplicationScoped")
    annotation("jakarta.persistence.Entity")
    annotation("io.quarkus.test.junit.QuarkusTest")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_25
        javaParameters = true
    }
}

noArg {
    annotation("jakarta.persistence.Entity")
}
