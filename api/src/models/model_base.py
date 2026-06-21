import uuid
from typing import Self

from sqlalchemy import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class BaseModel(Base):
    __abstract__ = True
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    @classmethod
    async def get(cls: type[Self], db: AsyncSession, pk: object) -> Self | None:
        return await db.get(cls, pk)
