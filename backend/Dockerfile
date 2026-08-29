FROM eclipse-temurin:25-jdk AS build

WORKDIR /app

COPY . .
RUN chmod +x gradlew
RUN ./gradlew build --no-daemon


FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=build /app/build/libs/FinFast-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]