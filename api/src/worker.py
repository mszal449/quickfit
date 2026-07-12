import asyncio

from structlog import getLogger

from common.exceptions import AppError
from common.logging_config import configure_logging
from config.db import close_db, get_session_factory, init_db
from config.service import get_config
from google_health import service as gh_service

LOG = getLogger()



async def run_sync():
    cfg = get_config()
    configure_logging("debug" if cfg.debug else "info")
    init_db(cfg.db_config)
    factory = get_session_factory()
    try:
        async with factory() as db:
            user_ids = await gh_service.users_to_sync(db)
        LOG.info("found_users_to_sync", count=len(user_ids))

        sync_counter = 0
        for user_id in user_ids:
            try:
                async with factory() as db:
                    await gh_service.sync_user(db, user_id)
                    sync_counter += 1
            except AppError as e:
                LOG.error("user_sync_failed", user_id=(str(user_id)), error=e)
                continue
        LOG.info("sync_run_completed", count=sync_counter)
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(run_sync())
