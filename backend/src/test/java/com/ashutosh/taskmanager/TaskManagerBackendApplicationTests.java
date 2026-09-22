package com.ashutosh.taskmanager;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:taskflow-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "jwt.secret=01234567890123456789012345678901",
        "jwt.expiration=3600000",
        "jwt.refresh-expiration=604800000"
})
class TaskManagerBackendApplicationTests {

    @Test
    void contextLoads() {
    }
}
