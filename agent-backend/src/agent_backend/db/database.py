"""
SQLAlchemy Async Database Models and Engine for Neon PostgreSQL.
Manages AI conversations and message history.
"""

from typing import AsyncGenerator
from datetime import datetime, timezone
import uuid
import logging
from sqlalchemy import String, Text, DateTime, JSON, ForeignKey, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from agent_backend.config import settings

logger = logging.getLogger("agent_backend.db")


class Base(DeclarativeBase):
    pass


class ConversationModel(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    messages = relationship(
        "ChatMessageModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessageModel.created_at"
    )


class ChatMessageModel(Base):
    __tablename__ = "ai_chat_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    sender: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    message: Mapped[str] = mapped_column(Text, default="")
    response_type: Mapped[str] = mapped_column(String(50), default="text_message")
    card_data: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    conversation = relationship("ConversationModel", back_populates="messages")


# Create Async Engine & Sessionmaker with connection timeout
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"timeout": 3, "command_timeout": 3}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async database session."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Create database tables if they do not exist."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully on Neon PostgreSQL.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")
        # Non-fatal if offline/no internet during tests
