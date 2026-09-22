package org.example.finfast.expenseservice

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

data class ErrorResponse(val message: String)

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(InvalidCategoryException::class)
    fun handleInvalidCategory(exception: InvalidCategoryException): ResponseEntity<ErrorResponse> =
        response(HttpStatus.BAD_REQUEST, exception.message ?: "Invalid category")

    @ExceptionHandler(ExpenseNotFoundException::class)
    fun handleExpenseNotFound(exception: ExpenseNotFoundException): ResponseEntity<ErrorResponse> =
        response(HttpStatus.NOT_FOUND, exception.message ?: "Expense not found")

    @ExceptionHandler(AuthenticationRequiredException::class)
    fun handleAuthenticationRequired(exception: AuthenticationRequiredException): ResponseEntity<ErrorResponse> =
        response(HttpStatus.UNAUTHORIZED, exception.message ?: "Authenticated user is required")

    @ExceptionHandler(
        MethodArgumentNotValidException::class,
        HttpMessageNotReadableException::class,
        MethodArgumentTypeMismatchException::class,
        IllegalArgumentException::class
    )
    fun handleBadRequest(exception: Exception): ResponseEntity<ErrorResponse> =
        response(HttpStatus.BAD_REQUEST, exception.message ?: "Invalid request")

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handleConflict(exception: DataIntegrityViolationException): ResponseEntity<ErrorResponse> =
        response(HttpStatus.CONFLICT, "Request conflicts with existing data")

    private fun response(status: HttpStatus, message: String): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(status).body(ErrorResponse(message))
}