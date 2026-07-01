from neo4j import AsyncGraphDatabase, AsyncDriver
from app.core.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

_driver: Optional[AsyncDriver] = None


async def get_driver() -> Optional[AsyncDriver]:
    global _driver
    if _driver is None:
        try:
            _driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            )
            await _driver.verify_connectivity()
            logger.info(f"Neo4j connected at {settings.NEO4J_URI}")
        except Exception as e:
            logger.warning(f"Neo4j unavailable ({settings.NEO4J_URI}): {e}. Graph features disabled.")
            _driver = None
    return _driver


async def reset_driver():
    """Close current driver and force reconnect on next get_driver() call."""
    global _driver
    if _driver:
        try:
            await _driver.close()
        except Exception:
            pass
    _driver = None
    logger.info("Neo4j driver reset — will reconnect on next request")


async def close_driver():
    await reset_driver()


async def test_connection(uri: str, user: str, password: str) -> dict:
    """Test a Neo4j connection without affecting the cached driver."""
    try:
        driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        await driver.verify_connectivity()
        async with driver.session() as session:
            result = await session.run("RETURN 1 AS ok")
            await result.data()
        await driver.close()
        return {"ok": True, "message": f"Connected to {uri}"}
    except Exception as e:
        return {"ok": False, "message": str(e)}
