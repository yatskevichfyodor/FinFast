package org.example.finfast.expenseservice.config

import org.apache.catalina.connector.Connector
import org.apache.tomcat.util.net.SSLHostConfig
import org.apache.tomcat.util.net.SSLHostConfigCertificate
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory
import org.springframework.boot.web.server.WebServerFactoryCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import java.nio.file.Paths

@Configuration
@Profile("https")
class HttpsConfig {

    @Bean
    fun httpsConnector(): WebServerFactoryCustomizer<TomcatServletWebServerFactory> =
        WebServerFactoryCustomizer { factory ->
            val connector = Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL)
            connector.port = 8333
            connector.scheme = "https"
            connector.secure = true
            connector.setProperty("SSLEnabled", "true")

            val sslHostConfig = SSLHostConfig()
            val certificate = SSLHostConfigCertificate(
                sslHostConfig,
                SSLHostConfigCertificate.Type.UNDEFINED
            )

            val certDir = Paths.get(
                System.getProperty("user.dir"),
                "..",
                "..",
                "certs"
            ).normalize()

            certificate.certificateFile =
                certDir.resolve("finfast-local.pem").toAbsolutePath().toString()

            certificate.certificateKeyFile =
                certDir.resolve("finfast-local-key.pem").toAbsolutePath().toString()

            sslHostConfig.addCertificate(certificate)
            connector.addSslHostConfig(sslHostConfig)

            factory.addAdditionalConnectors(connector)
        }
}