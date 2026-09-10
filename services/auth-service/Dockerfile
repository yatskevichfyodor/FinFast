FROM eclipse-temurin:25-jdk AS build

WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY gradle.properties .
COPY build.gradle.kts .
COPY settings.gradle.kts .

RUN chmod +x ./gradlew

RUN --mount=type=cache,id=finfast-auth-gradle,target=/root/.gradle \
    ./gradlew dependencies \
    --no-daemon

COPY src src

RUN --mount=type=cache,id=finfast-auth-gradle,target=/root/.gradle \
    ./gradlew quarkusBuild \
    -Dquarkus.package.jar.type=fast-jar \
    --no-daemon


FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=build /app/build/quarkus-app/ ./

ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]