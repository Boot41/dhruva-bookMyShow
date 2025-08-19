from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from routers import auth as auth_router
from routers import movies as movies_router

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
    # Create tables if not exist (for initial dev). Use Alembic for real migrations later.
    Base.metadata.create_all(bind=engine)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


# Routers
app.include_router(auth_router.router)
app.include_router(movies_router.router)
