"""Neo4j knowledge graph operations."""
import re
from typing import Optional
from app.core.neo4j_client import get_driver
from app.services import ai_service
import logging

logger = logging.getLogger(__name__)


def _norm(name: str) -> str:
    """Normalize entity names so 'react', 'React.js', 'ReactJS' all merge cleanly."""
    name = name.strip()
    # Remove trailing punctuation, collapse whitespace
    name = re.sub(r"[^\w\s\-\.]", "", name).strip()
    name = re.sub(r"\s+", " ", name)
    # Title-case for consistency: "machine learning" → "Machine Learning"
    return name.title() if name else name


async def upsert_note_graph(
    note_id: int,
    title: str,
    content: str,
    tags: list[str],
    category: Optional[str],
):
    driver = await get_driver()
    if not driver:
        return

    entities = await ai_service.extract_entities(content)

    async with driver.session() as session:
        # Upsert Note node
        await session.run(
            "MERGE (n:Note {note_id: $id}) "
            "SET n.title = $title, n.category = $category",
            id=note_id, title=title, category=category or "",
        )

        # Tags — stored lowercase
        for tag in tags:
            t = tag.strip().lower()
            if not t:
                continue
            await session.run(
                "MERGE (t:Tag {name: $name}) "
                "WITH t MATCH (n:Note {note_id: $id}) "
                "MERGE (n)-[:HAS_TAG]->(t)",
                name=t, id=note_id,
            )

        # Generic entity helper
        async def link_entity(label: str, raw_name: str):
            name = _norm(raw_name)
            if not name or len(name) < 2:
                return
            await session.run(
                f"MERGE (e:{label} {{name: $name}}) "
                f"WITH e MATCH (n:Note {{note_id: $id}}) "
                f"MERGE (n)-[:MENTIONS]->(e)",
                name=name, id=note_id,
            )

        for item in entities.get("concepts", []):
            await link_entity("Concept", item)
        for item in entities.get("people", []):
            await link_entity("Person", item)
        for item in entities.get("organizations", []):
            await link_entity("Organization", item)
        for item in entities.get("places", []):
            await link_entity("Place", item)

        # Cross-note similarity: connect notes that share 2+ concepts
        await session.run(
            """
            MATCH (n:Note {note_id: $id})-[:MENTIONS]->(e)<-[:MENTIONS]-(other:Note)
            WHERE other.note_id <> $id
            WITH n, other, count(e) AS shared
            WHERE shared >= 2
            MERGE (n)-[:RELATED_TO {shared: shared}]->(other)
            """,
            id=note_id,
        )


async def delete_note_graph(note_id: int):
    driver = await get_driver()
    if not driver:
        return
    async with driver.session() as session:
        await session.run(
            "MATCH (n:Note {note_id: $id}) DETACH DELETE n",
            id=note_id,
        )


async def get_graph_data() -> dict:
    driver = await get_driver()
    if not driver:
        return {"nodes": [], "links": []}

    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (n)-[r]->(m)
            RETURN
              elementId(n) AS src_eid, labels(n)[0] AS src_label,
              n.name AS src_name, n.title AS src_title, n.note_id AS src_note_id,
              type(r) AS rel_type,
              elementId(m) AS tgt_eid, labels(m)[0] AS tgt_label,
              m.name AS tgt_name, m.title AS tgt_title, m.note_id AS tgt_note_id
            LIMIT 800
            """
        )
        records = await result.data()

    nodes_map: dict[str, dict] = {}
    links = []

    def node_name(rec, prefix):
        return rec.get(f"{prefix}_name") or rec.get(f"{prefix}_title") or ""

    for rec in records:
        src = rec["src_eid"]
        tgt = rec["tgt_eid"]

        if src not in nodes_map:
            nodes_map[src] = {
                "id": src,
                "label": rec["src_label"],
                "name": node_name(rec, "src"),
                "note_id": rec.get("src_note_id"),
            }
        if tgt not in nodes_map:
            nodes_map[tgt] = {
                "id": tgt,
                "label": rec["tgt_label"],
                "name": node_name(rec, "tgt"),
                "note_id": rec.get("tgt_note_id"),
            }

        links.append({"source": src, "target": tgt, "type": rec["rel_type"]})

    return {"nodes": list(nodes_map.values()), "links": links}


async def get_node_context(label: str, name: str, note_id: Optional[int] = None) -> dict:
    """Return all notes connected to a given entity node."""
    driver = await get_driver()
    if not driver:
        return {"entity": {"label": label, "name": name}, "notes": []}

    async with driver.session() as session:
        if note_id:
            # Clicked a Note node — return its details and related notes
            result = await session.run(
                """
                MATCH (n:Note {note_id: $note_id})
                OPTIONAL MATCH (n)-[r]->(e)
                RETURN n.title AS title, collect({type: type(r), name: e.name, label: labels(e)[0]}) AS relations
                """,
                note_id=note_id,
            )
            rows = await result.data()
            return {
                "entity": {"label": "Note", "name": rows[0]["title"] if rows else name},
                "relations": rows[0]["relations"] if rows else [],
                "notes": [],
            }
        else:
            # Clicked an entity node — find all notes that mention it
            result = await session.run(
                """
                MATCH (e {name: $name})
                WHERE $label IN labels(e)
                MATCH (n:Note)-[r]->(e)
                RETURN n.note_id AS note_id, n.title AS title, type(r) AS rel
                ORDER BY n.title
                LIMIT 30
                """,
                name=name, label=label,
            )
            return {"entity": {"label": label, "name": name}, "rows": await result.data()}


async def search_graph(query: str) -> list[dict]:
    driver = await get_driver()
    if not driver:
        return []
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (n)
            WHERE toLower(n.name) CONTAINS toLower($q)
               OR toLower(n.title) CONTAINS toLower($q)
            RETURN labels(n)[0] AS label, n.name AS name,
                   n.title AS title, n.note_id AS note_id
            LIMIT 20
            """,
            q=query,
        )
        return await result.data()
