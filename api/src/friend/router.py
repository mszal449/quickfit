from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from auth.dependencies import CurrentUserId
from common.schema import Page
from config.middleware import DbSession
from friend import service
from friend.schema import FriendRequestCreate, FriendshipFilterParams, FriendshipOut

router = APIRouter(prefix="/friend", tags=["friend"])


@router.get("", response_model=Page[FriendshipOut])
async def get_friendships(
    user_id: CurrentUserId,
    filters: Annotated[FriendshipFilterParams, Query()],
    db: DbSession,
) -> Page[FriendshipOut]:
    friendships = await service.list_friendships(db, user_id, filters)
    return Page[FriendshipOut](items=friendships, total=len(friendships))


@router.post("/request", status_code=status.HTTP_201_CREATED, response_model=FriendshipOut)
async def send_friend_request(
    user_id: CurrentUserId, payload: FriendRequestCreate, db: DbSession
) -> FriendshipOut:
    return await service.send_friend_request(db, user_id, payload)


@router.post("/{friendship_id}/accept", response_model=FriendshipOut)
async def accept_friend_request(
    user_id: CurrentUserId, friendship_id: UUID, db: DbSession
) -> FriendshipOut:
    return await service.accept_friend_request(db, user_id, friendship_id)


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friendship(user_id: CurrentUserId, friendship_id: UUID, db: DbSession) -> None:
    return await service.remove_friendship(db, user_id, friendship_id)
