import asyncio
import contextlib
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from mcp_server.safety import cleanup_expired, init_db

def setup_logging():
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(20), # INFO
        cache_logger_on_first_use=True,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    await init_db()
    cleanup_task = asyncio.create_task(cleanup_expired())
    logger = structlog.get_logger()
    logger.info("mcp_server_started", version="0.1.0")
    try:
        yield
    finally:
        cleanup_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await cleanup_task
    # Shutdown
    logger.info("mcp_server_stopped")
