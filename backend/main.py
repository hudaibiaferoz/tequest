"""
TeQuest 2026 — FastAPI Backend
Neon PostgreSQL + Full REST API
"""
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
import os
from typing import Optional, List
from pydantic import BaseModel, validator
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

# ── Database URL ──
DATABASE_URL = os.getenv("DATABASE_URL", "")
ADMIN_KEY = os.getenv("ADMIN_KEY", "tecquest2026")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# ── Connection Pool ──
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    await init_db()
    yield
    await db_pool.close()

app = FastAPI(
    title="TeQuest 2026 API",
    description="Registration backend for TeQuest — The Ultimate Tech Challenge at JUW",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tequest-96cq.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB Dependency ──
async def get_db():
    async with db_pool.acquire() as conn:
        yield conn

# ── Admin Auth ──
def require_admin(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# ── Init Tables ──
async def init_db():
    async with db_pool.acquire() as conn:
        await conn.execute("""
        CREATE TABLE IF NOT EXISTS competitions (
            id          SERIAL PRIMARY KEY,
            name        VARCHAR(120) NOT NULL,
            icon        VARCHAR(10)  DEFAULT '🏆',
            description TEXT,
            max_teams   INTEGER      DEFAULT 20,
            is_open     BOOLEAN      DEFAULT TRUE,
            created_at  TIMESTAMPTZ  DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS teams (
            id              SERIAL PRIMARY KEY,
            competition_id  INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
            team_name       VARCHAR(80) NOT NULL,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS participants (
            id          SERIAL PRIMARY KEY,
            team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE,
            full_name   VARCHAR(120) NOT NULL,
            father_name VARCHAR(120) NOT NULL,
            juw_id      VARCHAR(30)  NOT NULL UNIQUE,
            batch       VARCHAR(20)  NOT NULL,
            section     VARCHAR(10)  NOT NULL,
            is_leader   BOOLEAN      DEFAULT FALSE,
            created_at  TIMESTAMPTZ  DEFAULT NOW()
        );
        """)
        # Seed competitions if empty
        count = await conn.fetchval("SELECT COUNT(*) FROM competitions")
        if count == 0:
            await conn.executemany(
                "INSERT INTO competitions (name, icon, description) VALUES ($1,$2,$3)",
                [
                    ("Think Fast to Win Challenge", "🧩", "Solve riddles, crack the clues and prove your thinking. Logic meets lateral thinking under time pressure."),
                    ("Battle of Interfaces", "🎨", "Recreate. Innovate. Impress. Recreate a given UI with creativity and precision."),
                    ("Frames of Imagination", "📽️", "Impress. Connect. Inspire. Tell a story with creativity and logic through visual presentation."),
                    ("Race Against the Clock", "⚡", "Complete the most coding tasks in limited time. Show your speed and programming skills."),
                    ("Watch. Recall. Rebuild.", "🧠", "Test your memory, recall and attention to detail. Watch it, then rebuild it from memory."),
                ]
            )

# ═══════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════

class MemberIn(BaseModel):
    full_name: str
    father_name: str
    juw_id: str
    batch: str
    section: str
    is_leader: bool = False

    @validator('section')
    def valid_section(cls, v):
        if v not in ("SE-A", "SE-B", "DS", "CS"):
            raise ValueError("Invalid section")
        return v

    @validator('batch')
    def valid_batch(cls, v):
        if v not in ("Batch 26",):
            raise ValueError("Invalid batch")
        return v

    @validator('juw_id')
    def valid_id(cls, v):
        import re
        if not re.match(r'^[A-Za-z0-9\-]{5,20}$', v.strip()):
            raise ValueError("Invalid JUW ID format")
        return v.strip().upper()

class RegistrationIn(BaseModel):
    competition_id: int
    team_name: str
    member1: MemberIn
    member2: MemberIn

    @validator('team_name')
    def valid_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Team name too short")
        return v.strip()

# ═══════════════════════════════════════
# PUBLIC ENDPOINTS
# ═══════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "TeQuest 2026 API — Active", "event": "May 20, 2026"}

@app.get("/api/competitions")
async def get_competitions(conn=Depends(get_db)):
    rows = await conn.fetch("""
        SELECT c.id, c.name, c.icon, c.description, c.max_teams, c.is_open,
               COUNT(t.id) AS registered_teams
        FROM competitions c
        LEFT JOIN teams t ON t.competition_id = c.id
        GROUP BY c.id
        ORDER BY c.id
    """)
    return [dict(r) for r in rows]

@app.post("/api/register", status_code=201)
async def register_team(data: RegistrationIn, conn=Depends(get_db)):
    async with conn.transaction():
        # 1. Check competition exists & is open
        comp = await conn.fetchrow(
            "SELECT * FROM competitions WHERE id=$1", data.competition_id
        )
        if not comp:
            raise HTTPException(404, "Competition not found")
        if not comp["is_open"]:
            raise HTTPException(400, "Registration for this competition is closed")

        # 2. Check slot availability
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM teams WHERE competition_id=$1", data.competition_id
        )
        if count >= comp["max_teams"]:
            raise HTTPException(400, f"This competition is full (max {comp['max_teams']} teams)")

        # 3. Check duplicate JUW IDs
        m1_id = data.member1.juw_id
        m2_id = data.member2.juw_id
        if m1_id == m2_id:
            raise HTTPException(400, "Both members must have different JUW IDs")

        for juw_id in (m1_id, m2_id):
            exists = await conn.fetchval(
                "SELECT 1 FROM participants WHERE juw_id=$1", juw_id
            )
            if exists:
                raise HTTPException(400, f"JUW ID {juw_id} is already registered")

        # 4. Check duplicate team name in same competition
        name_exists = await conn.fetchval(
            "SELECT 1 FROM teams WHERE competition_id=$1 AND LOWER(team_name)=LOWER($2)",
            data.competition_id, data.team_name
        )
        if name_exists:
            raise HTTPException(400, "A team with this name is already registered for this competition")

        # 5. Insert team
        team_id = await conn.fetchval(
            "INSERT INTO teams (competition_id, team_name) VALUES ($1,$2) RETURNING id",
            data.competition_id, data.team_name
        )

        # 6. Insert participants
        for m in (data.member1, data.member2):
            await conn.execute(
                """INSERT INTO participants
                   (team_id, full_name, father_name, juw_id, batch, section, is_leader)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                team_id, m.full_name, m.father_name, m.juw_id,
                m.batch, m.section, m.is_leader
            )

        return {
            "success": True,
            "team_id": team_id,
            "team_name": data.team_name,
            "competition": comp["name"],
            "message": "Registration successful!"
        }

# ═══════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════

@app.get("/api/admin/teams")
async def admin_get_teams(conn=Depends(get_db), _=Depends(require_admin)):
    teams = await conn.fetch("""
        SELECT t.id, t.competition_id, t.team_name, t.created_at,
               c.name AS competition_name
        FROM teams t
        JOIN competitions c ON c.id = t.competition_id
        ORDER BY t.created_at DESC
    """)
    result = []
    for t in teams:
        parts = await conn.fetch(
            "SELECT * FROM participants WHERE team_id=$1 ORDER BY is_leader DESC", t["id"]
        )
        result.append({**dict(t), "participants": [dict(p) for p in parts]})
    return result

@app.delete("/api/admin/teams/{team_id}")
async def admin_delete_team(team_id: int, conn=Depends(get_db), _=Depends(require_admin)):
    result = await conn.execute("DELETE FROM teams WHERE id=$1", team_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Team not found")
    return {"success": True, "message": f"Team {team_id} deleted"}

@app.put("/api/admin/competitions/{comp_id}/toggle")
async def admin_toggle_competition(
    comp_id: int, body: dict, conn=Depends(get_db), _=Depends(require_admin)
):
    is_open = body.get("is_open", True)
    result = await conn.execute(
        "UPDATE competitions SET is_open=$1 WHERE id=$2", is_open, comp_id
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Competition not found")
    return {"success": True, "is_open": is_open}

@app.get("/api/admin/stats")
async def admin_stats(conn=Depends(get_db), _=Depends(require_admin)):
    total_teams = await conn.fetchval("SELECT COUNT(*) FROM teams")
    total_participants = await conn.fetchval("SELECT COUNT(*) FROM participants")
    comps = await conn.fetch("""
        SELECT c.name, COUNT(t.id) as teams, c.max_teams, c.is_open
        FROM competitions c LEFT JOIN teams t ON t.competition_id=c.id
        GROUP BY c.id ORDER BY c.id
    """)
    return {
        "total_teams": total_teams,
        "total_participants": total_participants,
        "competitions": [dict(c) for c in comps]
    }

# ── Health check ──
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
