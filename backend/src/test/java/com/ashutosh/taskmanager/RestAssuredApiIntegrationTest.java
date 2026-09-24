package com.ashutosh.taskmanager;

import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.test.autoconfigure.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

import static org.hamcrest.Matchers.equalTo;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:restassured;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "jwt.secret=01234567890123456789012345678901",
        "jwt.expiration=86400000",
        "jwt.refresh-expiration=604800000"
})
class RestAssuredApiIntegrationTest {

    @LocalServerPort
    int port;

    @Test
    void healthEndpointReturnsOk() {
        RestAssured
                .given()
                .port(port)
                .when()
                .get("/actuator/health")
                .then()
                .statusCode(200)
                .body("status", equalTo("UP"));
    }

    @Test
    void protectedTasksEndpointRejectsAnonymousRequests() {
        RestAssured
                .given()
                .port(port)
                .when()
                .get("/api/tasks")
                .then()
                .statusCode(403);
    }

    @Test
    void adminEndpointRejectsAnonymousRequests() {
        RestAssured
                .given()
                .port(port)
                .when()
                .get("/api/admin/users")
                .then()
                .statusCode(403);
    }
}
