#tech stack

- frontend: react
- backend: fastAPI
- database: postgresql
- connetion sqlalchemy


# BookMyShow Database Schema

This document outlines the database schema for the BookMyShow platform, designed to support all features mentioned in the product specification.

---

### Core Entities

-   **Users & Authentication**
-   **Movies & Theaters**
-   **Events & Venues**
-   **Bookings & Payments**
-   **Reviews & Social Features**
-   **Food & Beverages**

---

### Table Structures

#### 1. `users`
*Stores user account information.*

| Name                       | DataType  | Notes            |
|----------------------------|-----------|------------------|
| `id`                       | BIGSERIAL | PK               |
| `email`                    | VARCHAR   | UNIQUE, NOT NULL |
| `phone`                    | VARCHAR   | UNIQUE           |
| `password_hash`            | VARCHAR   | NOT NULL         |
| `first_name`               | VARCHAR   | NOT NULL         |
| `last_name`                | VARCHAR   | NOT NULL         |
| `created_at`               | TIMESTAMP |                  |
| `updated_at`               | TIMESTAMP |                  |


#### 3. `cities`
*Stores city information for location-based services.*

| Name      | DataType | Notes    |
|-----------|----------|----------|
| `id`      | SERIAL   | PK       |
| `name`    | VARCHAR  | NOT NULL |
| `state`   | VARCHAR  |          |
| `country` | VARCHAR  | NOT NULL |

#### 4. `theaters`
*Stores information about individual cinemas.*

| Name         | DataType  | Notes             |
|--------------|-----------|-------------------|
| `id`         | BIGSERIAL | PK                |
| `name`       | VARCHAR   | NOT NULL          |
| `address`    | TEXT      | NOT NULL          |
| `city_id`    | INTEGER   | FK to `cities.id` |
| `amenities`  | JSONB     |                   |
| `is_active`  | BOOLEAN   |                   |

#### 5. `screens`
*Represents a single screen within a theater.*

| Name            | DataType  | Notes                |
|-----------------|-----------|----------------------|
| `id`            | BIGSERIAL | PK                   |
| `theater_id`    | BIGINT    | FK to `theaters.id`  |
| `name`          | VARCHAR   | NOT NULL             |
| `screen_type`   | VARCHAR   | e.g., 'IMAX', '4DX'  |
| `total_seats`   | INTEGER   | NOT NULL             |
| `layout_config` | JSONB     | NOT NULL             |

#### 6. `seats`
*Defines individual seats in a screen.*

| Name          | DataType  | Notes                       |
|---------------|-----------|-----------------------------|
| `id`          | BIGSERIAL | PK                          |
| `screen_id`   | BIGINT    | FK to `screens.id`          |
| `category_id` | INTEGER   | FK to `seat_categories.id`  |
| `row_name`    | VARCHAR   | NOT NULL                    |
| `seat_number` | INTEGER   | NOT NULL                    |

#### 7. `seat_categories`
*Defines seat types like 'Premium' or 'Standard'.*

| Name         | DataType | Notes    |
|--------------|----------|----------|
| `id`         | SERIAL   | PK       |
| `name`       | VARCHAR  | NOT NULL |
| `color_code` | VARCHAR  |          |

#### 8. `movies`
*Stores all details about a movie.*

| Name               | DataType  | Notes    |
|--------------------|-----------|----------|
| `id`               | BIGSERIAL | PK       |
| `title`            | VARCHAR   | NOT NULL |
| `description`      | TEXT      |          |
| `duration_minutes` | INTEGER   | NOT NULL |
| `release_date`     | DATE      |          |
| `language`         | VARCHAR   | NOT NULL |
| `genres`           | JSONB     |          |
| `poster_url`       | VARCHAR   |          |

#### 9. `shows`
*Represents a specific showtime of a movie at a screen.*

| Name              | DataType  | Notes             |
|-------------------|-----------|-------------------|
| `id`              | BIGSERIAL | PK                |
| `movie_id`        | BIGINT    | FK to `movies.id` |
| `screen_id`       | BIGINT    | FK to `screens.id`|
| `show_date`       | DATE      | NOT NULL          |
| `show_time`       | TIME      | NOT NULL          |
| `base_price`      | DECIMAL   | NOT NULL          |
| `available_seats` | INTEGER   | NOT NULL          |

#### 10. `events`
*Stores details for non-movie events like concerts or plays.*

| Name         | DataType  | Notes             |
|--------------|-----------|-------------------|
| `id`         | BIGSERIAL | PK                |
| `title`      | VARCHAR   | NOT NULL          |
| `event_type` | VARCHAR   | NOT NULL          |
| `venue_name` | VARCHAR   | NOT NULL          |
| `city_id`    | INTEGER   | FK to `cities.id` |
| `event_date` | DATE      | NOT NULL          |

#### 11. `event_ticket_categories`
*Defines ticket types for events, e.g., 'VIP', 'General Admission'.*

| Name             | DataType  | Notes            |
|------------------|-----------|------------------|
| `id`             | BIGSERIAL | PK               |
| `event_id`       | BIGINT    | FK to `events.id`|
| `name`           | VARCHAR   | NOT NULL         |
| `price`          | DECIMAL   | NOT NULL         |
| `total_quantity` | INTEGER   | NOT NULL         |

#### 12. `bookings`
*The central table for all user bookings.*

| Name                | DataType  | Notes                         |
|---------------------|-----------|-------------------------------|
| `id`                | BIGSERIAL | PK                            |
| `user_id`           | BIGINT    | FK to `users.id`              |
| `booking_type`      | VARCHAR   | NOT NULL, 'movie' or 'event' |
| `show_id`           | BIGINT    | FK to `shows.id`, NULLABLE    |
| `event_id`          | BIGINT    | FK to `events.id`, NULLABLE   |
| `booking_reference` | VARCHAR   | UNIQUE, NOT NULL              |
| `final_amount`      | DECIMAL   | NOT NULL                      |
| `booking_status`    | VARCHAR   | NOT NULL                      |
| `created_at`        | TIMESTAMP |                               |

#### 13. `booking_seats`
*Junction table linking a movie booking to specific seats.*

| Name         | DataType  | Notes               |
|--------------|-----------|---------------------|
| `id`         | BIGSERIAL | PK                  |
| `booking_id` | BIGINT    | FK to `bookings.id` |
| `seat_id`    | BIGINT    | FK to `seats.id`    |
*UNIQUE (booking_id, seat_id)*

#### 14. `booking_event_tickets`
*Junction table for event bookings and ticket categories.*

| Name                 | DataType  | Notes                               |
|----------------------|-----------|-------------------------------------|
| `id`                 | BIGSERIAL | PK                                  |
| `booking_id`         | BIGINT    | FK to `bookings.id`                 |
| `ticket_category_id` | BIGINT    | FK to `event_ticket_categories.id`  |
| `quantity`           | INTEGER   | NOT NULL                            |
*UNIQUE (booking_id, ticket_category_id)*

#### 16. `reviews`
*Stores user reviews for movies and events.*

| Name          | DataType  | Notes                        |
|---------------|-----------|------------------------------|
| `id`          | BIGSERIAL | PK                           |
| `user_id`     | BIGINT    | FK to `users.id`             |
| `movie_id`    | BIGINT    | FK to `movies.id`, NULLABLE  |
| `event_id`    | BIGINT    | FK to `events.id`, NULLABLE  |
| `rating`      | INTEGER   | NOT NULL, 1 to 5             |
| `review_text` | TEXT      |                              |

#### 17. `fnb_items`
*Food and beverage items available at theaters.*

| Name           | DataType  | Notes               |
|----------------|-----------|---------------------|
| `id`           | BIGSERIAL | PK                  |
| `theater_id`   | BIGINT    | FK to `theaters.id` |
| `name`         | VARCHAR   | NOT NULL            |
| `price`        | DECIMAL   | NOT NULL            |
| `is_available` | BOOLEAN   |                     |

#### 18. `fnb_orders`
*Tracks F&B orders linked to a booking.*

| Name           | DataType  | Notes               |
|----------------|-----------|---------------------|
| `id`           | BIGSERIAL | PK                  |
| `booking_id`   | BIGINT    | FK to `bookings.id` |
| `total_amount` | DECIMAL   | NOT NULL            |
| `order_status` | VARCHAR   | NOT NULL            |

---

### Indexes and Constraints

-   **`users`**: 
    -   Index on `(email)` for fast login lookups.
    -   Index on `(phone)`.
-   **`user_social_logins`**: 
    -   Unique constraint on `(provider, provider_user_id)`.
    -   Index on `(user_id)`.
-   **`theaters`**: 
    -   Index on `(city_id)` to filter theaters by city.
    -   Index on `(name)`.
-   **`screens`**: 
    -   Index on `(theater_id)`.
-   **`seats`**: 
    -   Unique constraint on `(screen_id, row_name, seat_number)` to prevent duplicate seats.
-   **`movies`**: 
    -   Index on `(release_date)` for sorting by new releases.
    -   Index on `(title)` for search.
-   **`shows`**: 
    -   Unique constraint on `(screen_id, show_date, show_time)` to avoid scheduling conflicts.
    -   Index on `(movie_id)`.
    -   Index on `(show_date)`.
-   **`events`**: 
    -   Index on `(city_id, event_date)` for location and date-based searches.
    -   Index on `(title)`.
-   **`bookings`**: 
    -   Index on `(user_id)` to fetch a user's booking history.
    -   Index on `(show_id)` and `(event_id)`.
    -   Index on `(booking_reference)`.
-   **`booking_seats`**: 
    -   Index on `(booking_id)`.
    -   Index on `(seat_id)`.
-   **`payments`**: 
    -   Index on `(booking_id)`.
    -   Index on `(gateway_transaction_id)`.
-   **`reviews`**: 
    -   Index on `(user_id)`.
    -   Index on `(movie_id)` and `(event_id)`.
