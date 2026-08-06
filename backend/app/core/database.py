from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# In tests, a different DB url might be injected
DATABASE_URL = settings.DATABASE_URL
if settings.ENVIRONMENT == "test" and settings.TEST_DATABASE_URL:
    DATABASE_URL = settings.TEST_DATABASE_URL

# For SQLAlchemy 2.0+ engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    # Make sure pool size is reasonable for MVP
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator:
    """Dependency generator for database sessions in FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
