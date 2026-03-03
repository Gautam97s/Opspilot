import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI

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
    logger = structlog.get_logger()
    await logger.info("mcp_server_started", version="0.1.0")
    yield
    # Shutdown
    await logger.info("mcp_server_stopped")
