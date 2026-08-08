from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

_settings = get_settings()
_db_url = _settings.database_url
_is_sqlite = _db_url.startswith("sqlite")

# Local SQLite file lives next to the API package when using the default URL.
if _is_sqlite and _db_url.startswith("sqlite:///./"):
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

_connect_args = {"check_same_thread": False} if _is_sqlite else {}
engine = create_engine(
    _db_url,
    pool_pre_ping=not _is_sqlite,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text,
      provider text NOT NULL DEFAULT 'email',
      google_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS profiles (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      handle text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT '',
      avatar_url text,
      is_public boolean NOT NULL DEFAULT false,
      share_notes boolean NOT NULL DEFAULT true,
      share_photos boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text",
    """
    CREATE TABLE IF NOT EXISTS peak_logs (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      peak_id text NOT NULL,
      done boolean NOT NULL DEFAULT false,
      completed_on date,
      notes text NOT NULL DEFAULT '',
      image_url text,
      peak_name text,
      area_slug text,
      area_name text,
      height integer,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, peak_id)
    )
    """,
    "ALTER TABLE peak_logs ADD COLUMN IF NOT EXISTS peak_name text",
    "ALTER TABLE peak_logs ADD COLUMN IF NOT EXISTS area_slug text",
    "ALTER TABLE peak_logs ADD COLUMN IF NOT EXISTS area_name text",
    "ALTER TABLE peak_logs ADD COLUMN IF NOT EXISTS height integer",
    """
    CREATE TABLE IF NOT EXISTS posts (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body text NOT NULL,
      image_url text NOT NULL,
      peak_id text,
      peak_name text,
      area_slug text,
      area_name text,
      height integer,
      hike_id text,
      hike_name text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC)",
    "CREATE INDEX IF NOT EXISTS posts_user_created_at_idx ON posts (user_id, created_at DESC)",
    """
    CREATE TABLE IF NOT EXISTS post_likes (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, post_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes (post_id)",
    """
    CREATE TABLE IF NOT EXISTS follows (
      follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (follower_id, following_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows (following_id)",
    """
    CREATE TABLE IF NOT EXISTS post_comments (
      id uuid PRIMARY KEY,
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS post_comments_post_created_idx ON post_comments (post_id, created_at ASC)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_json text",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS route_url text",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS route_label text",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS activity text",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false",
    """
    CREATE TABLE IF NOT EXISTS peak_ratings (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      peak_id text NOT NULL,
      kind text NOT NULL DEFAULT 'pitch',
      score integer NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, peak_id, kind)
    )
    """,
]


def _sqlite_add_column(conn: Connection, table: str, column: str, ddl: str) -> None:
    cols = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()}
    if column not in cols:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


def ensure_schema() -> None:
    if _is_sqlite:
        from app.models import Base

        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            _sqlite_add_column(conn, "users", "phone", "phone text")
            _sqlite_add_column(conn, "posts", "media_json", "media_json text")
            _sqlite_add_column(conn, "posts", "route_url", "route_url text")
            _sqlite_add_column(conn, "posts", "route_label", "route_label text")
            _sqlite_add_column(conn, "posts", "activity", "activity text")
            _sqlite_add_column(
                conn, "posts", "is_hidden", "is_hidden boolean NOT NULL DEFAULT 0"
            )
        return

    with engine.begin() as conn:
        for statement in SCHEMA_STATEMENTS:
            conn.execute(text(statement))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
