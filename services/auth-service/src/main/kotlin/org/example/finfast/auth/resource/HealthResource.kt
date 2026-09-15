package org.example.finfast.auth.resource

import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.core.Response

@Path("/health")
class HealthResource {

    @GET
    fun health(): Response = Response.ok().build()
}