from pydoc import importfile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from routers import theaters as theaters_router
from routers import auth as auth_router
from routers import movies as movies_router
from routers import shows as shows_router
from routers import cities as cities_router
from routers import screens as screens_router
from routers import bookings as bookings_router
from routers import search as search_router
from routers import theater_memberships as theater_memberships_router

app = FastAPI(title="BookMyShow Backend")

# CORS (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Dev convenience: auto-creates tables if missing.
    # Use proper migrations for schema changes in staging/prod.
    Base.metadata.create_all(bind=engine)

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

# Routers
app.include_router(auth_router.router)  # Auth endpoints (register/login/me)
app.include_router(movies_router.router)  # Movies CRUD/listing (write ops protected)
app.include_router(theaters_router.router)  # Theater listings (city/movie filters)
app.include_router(shows_router.router)  # Show search/create/delete (protected)
app.include_router(cities_router.router)  # Cities listing
app.include_router(screens_router.router)  # Screens by theater
app.include_router(bookings_router.router)  # Booking APIs and seat holds/status
app.include_router(search_router.router)  # Unified search across movies/theaters
app.include_router(theater_memberships_router.router)  # Theater admin memberships
