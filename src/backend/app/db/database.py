import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

RAW_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_rFvRn3LNpm0q@ep-fancy-morning-ax0tgw8p-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
)
DATABASE_URL = RAW_URL.strip().strip('"').strip("'") if RAW_URL else ""

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
    with engine.connect() as conn:
        pass
except Exception as e:
    logging.warning(f"PostgreSQL connection failed ({e}), falling back to SQLite engine")
    db_dir = "/tmp" if os.getenv("VERCEL") else "."
    db_path = os.path.join(db_dir, "powergrid.db")
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
