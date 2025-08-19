# BookMyShow API Specification

## Base URL
```
https://api.bookmyshow.com/v1
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Authentication & User Management

### 1.1 User Registration
**POST** `/auth/register`



### 1.2 User Login
**POST** `/auth/login`



### 1.3 Refresh Token
**POST** `/auth/refresh`


### 1.4 Logout
**POST** `/auth/logout`
*Requires Authentication*


---

## 2. Movie Discovery & Information

### 2.1 Get Movies
**GET** `/movies`

**Query Parameters:**
- `city_id` (optional): Filter by city
- `genre` (optional): Filter by genre
- `language` (optional): Filter by language
- `search` (optional): Search by title
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)


### 2.2 Get Movie Details
**GET** `/movies/{movie_id}`


### 2.3 Get Movie Reviews
**GET** `/movies/{movie_id}/reviews`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page


### 2.4 Add Movie Review
**POST** `/movies/{movie_id}/reviews`
*Requires Authentication*


---

## 3. Theater & Showtime Management

### 3.1 Get Cities
**GET** `/cities`


### 3.2 Get Theaters
**GET** `/theaters`

**Query Parameters:**
- `city_id` (required): City ID
- `movie_id` (optional): Filter theaters showing specific movie
- `latitude` (optional): User latitude for distance calculation
- `longitude` (optional): User longitude for distance calculation


### 3.3 Get Shows for Movie
**GET** `/movies/{movie_id}/shows`

**Query Parameters:**
- `city_id` (required): City ID
- `date` (optional): Show date (YYYY-MM-DD, default: today)
- `theater_id` (optional): Filter by specific theater


### 3.4 Get Show Details
**GET** `/shows/{show_id}`


---

## 4. Seat Selection & Booking

### 4.1 Get Seat Layout
**GET** `/shows/{show_id}/seats`


### 4.2 Hold Seats (Temporary Lock)
**POST** `/shows/{show_id}/seats/hold`
*Requires Authentication*


### 4.3 Create Booking
**POST** `/bookings`
*Requires Authentication*


### 4.4 Process Payment
**POST** `/bookings/{booking_id}/payment`
*Requires Authentication*


---

## 5. Events & Experiences

### 5.1 Get Events
**GET** `/events`

**Query Parameters:**
- `city_id` (required): City ID
- `event_type` (optional): Filter by event type
- `date_from` (optional): Start date filter
- `date_to` (optional): End date filter
- `search` (optional): Search by title


### 5.2 Get Event Details
**GET** `/events/{event_id}`


### 5.3 Book Event Tickets
**POST** `/events/{event_id}/bookings`
*Requires Authentication*


---

## 6. User Profile & History

### 6.1 Get User Profile
**GET** `/users/profile`
*Requires Authentication*


### 6.2 Update User Profile
**PUT** `/users/profile`
*Requires Authentication*


### 6.3 Get Booking History
**GET** `/users/bookings`
*Requires Authentication*

**Query Parameters:**
- `status` (optional): Filter by booking status
- `type` (optional): Filter by booking type (movie/event)
- `page` (optional): Page number
- `limit` (optional): Items per page


### 6.4 Get Booking Details
**GET** `/bookings/{booking_id}`
*Requires Authentication*


---

## 7. Food & Beverage

### 7.1 Get F&B Menu
**GET** `/theaters/{theater_id}/fnb`


### 7.2 Add F&B to Booking
**POST** `/bookings/{booking_id}/fnb`
*Requires Authentication*


---

## 8. Admin & Theater Partner APIs

### 8.1 Theater Management - Add Theater
**POST** `/admin/theaters`
*Requires Admin Authentication*


### 8.2 Theater Management - Add Screen
**POST** `/admin/theaters/{theater_id}/screens`
*Requires Admin Authentication*


### 8.3 Show Management - Create Show
**POST** `/admin/shows`
*Requires Admin Authentication*


### 8.4 Movie Management - Add Movie
**POST** `/admin/movies`
*Requires Admin Authentication*


---

## Error Responses

All API endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes:
- `VALIDATION_ERROR` - Invalid request data
- `AUTHENTICATION_REQUIRED` - Missing or invalid authentication
- `AUTHORIZATION_FAILED` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `SEATS_NOT_AVAILABLE` - Selected seats are no longer available
- `PAYMENT_FAILED` - Payment processing failed
- `BOOKING_EXPIRED` - Booking hold has expired

---
