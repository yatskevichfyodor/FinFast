pluginManagement {
    val quarkusPluginVersion: String = providers.gradleProperty("quarkusPluginVersion").get()
    val quarkusPluginId: String = providers.gradleProperty("quarkusPluginId").get()
    repositories {
        mavenCentral()
        gradlePluginPortal()
        mavenLocal()
    }
    plugins {
        id(quarkusPluginId) version quarkusPluginVersion
    }
}
rootProject.name = "auth-service"
