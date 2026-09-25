"""
Chat Repository for Neon PostgreSQL.
Provides CRUD operations for conversation threads and message history.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession
from agent_backend.db.database import AsyncSessionLocal, ConversationModel, ChatMessageModel
from agent_backend.schemas.card_models import AgentCardResponse

logger = logging.getLogger("agent_backend.repository")


class ChatRepository:
    """Async repository for managing AI chat persistence in PostgreSQL."""

    @staticmethod
    async def get_or_create_conversation(
        conv_id: str,
        user_email: str,
        title: Optional[str] = None
    ) -> ConversationModel:
        """Fetch existing conversation or create a new one."""
        async with AsyncSessionLocal() as session:
            stmt = select(ConversationModel).where(ConversationModel.id == conv_id)
            res = await session.execute(stmt)
            conv = res.scalar_one_or_none()

            if not conv:
                conv = ConversationModel(
                    id=conv_id,
                    user_email=user_email,
                    title=title or "New Conversation",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                session.add(conv)
                await session.commit()
                await session.refresh(conv)
            return conv

    @staticmethod
    async def list_conversations(user_email: str) -> List[Dict[str, Any]]:
        """List all conversations for a user, ordered by most recently updated."""
        async with AsyncSessionLocal() as session:
            stmt = (
                select(ConversationModel)
                .where(ConversationModel.user_email == user_email)
                .order_by(desc(ConversationModel.updated_at))
            )
            res = await session.execute(stmt)
            conversations = res.scalars().all()

            results = []
            for c in conversations:
                results.append({
                    "id": c.id,
                    "title": c.title,
                    "user_email": c.user_email,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None
                })
            return results

    @staticmethod
    async def get_conversation_messages(conv_id: str) -> List[Dict[str, Any]]:
        """Fetch all messages for a specific conversation in chronological order."""
        async with AsyncSessionLocal() as session:
            stmt = (
                select(ChatMessageModel)
                .where(ChatMessageModel.conversation_id == conv_id)
                .order_by(ChatMessageModel.created_at.asc())
            )
            res = await session.execute(stmt)
            messages = res.scalars().all()

            return [
                {
                    "id": m.id,
                    "conversation_id": m.conversation_id,
                    "sender": m.sender,
                    "message": m.message,
                    "response_type": m.response_type,
                    "card_data": m.card_data or {},
                    "created_at": m.created_at.isoformat() if m.created_at else None
                }
                for m in messages
            ]

    @staticmethod
    async def save_chat_turn(
        conv_id: str,
        user_email: str,
        user_text: str,
        assistant_card_response: AgentCardResponse,
        thread_title: Optional[str] = None
    ):
        """
        Persist a complete turn (user prompt + assistant card response) to the database.
        Also updates the conversation's updated_at timestamp and title if needed.
        """
        async with AsyncSessionLocal() as session:
            # 1. Ensure conversation exists
            stmt = select(ConversationModel).where(ConversationModel.id == conv_id)
            res = await session.execute(stmt)
            conv = res.scalar_one_or_none()

            now = datetime.now(timezone.utc)
            if not conv:
                # Derive title from user prompt (first ~40 chars)
                derived_title = thread_title or (user_text[:40] + "..." if len(user_text) > 40 else user_text)
                conv = ConversationModel(
                    id=conv_id,
                    user_email=user_email,
                    title=derived_title or "New Conversation",
                    created_at=now,
                    updated_at=now
                )
                session.add(conv)
            else:
                conv.updated_at = now
                if conv.title == "New Conversation" and user_text:
                    conv.title = user_text[:40] + "..." if len(user_text) > 40 else user_text

            # 2. Add User Message
            user_msg = ChatMessageModel(
                id=str(uuid.uuid4()),
                conversation_id=conv_id,
                sender="user",
                message=user_text,
                response_type="user_prompt",
                card_data={},
                created_at=now
            )
            session.add(user_msg)

            # 3. Add Assistant Message with typed card_data
            asst_msg = ChatMessageModel(
                id=str(uuid.uuid4()),
                conversation_id=conv_id,
                sender="assistant",
                message=assistant_card_response.message,
                response_type=assistant_card_response.response_type,
                card_data=assistant_card_response.card_data,
                created_at=now
            )
            session.add(asst_msg)

            await session.commit()
            logger.info(f"Persisted chat turn to Neon DB for conv_id '{conv_id}'")

    @staticmethod
    async def delete_conversation(conv_id: str, user_email: Optional[str] = None) -> bool:
        """Delete a conversation and all its messages."""
        async with AsyncSessionLocal() as session:
            stmt = delete(ConversationModel).where(ConversationModel.id == conv_id)
            if user_email:
                stmt = stmt.where(ConversationModel.user_email == user_email)
            res = await session.execute(stmt)
            await session.commit()
            return res.rowcount > 0


chat_repository = ChatRepository()
