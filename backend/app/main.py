from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.config import settings
from app.database import init_indexes, seed_admin_user
from app.routes.ai_planning import router as ai_planning_router
from app.routes.b2b_api import router as b2b_api_router
from app.routes.inventory import router as inventory_router
from app.routes.labor import router as labor_router
from app.routes.projects import router as projects_router
from app.routes.public import router as public_router
from app.routes.subscriptions import router as subscriptions_router
from app.routes.versions import router as versions_router

app = FastAPI(title="Fundingwise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_indexes()
    await seed_admin_user()


@app.get("/")
async def root():
    return {"status": "ok", "service": "Fundingwise API"}


app.include_router(auth_router)

# Future routers are registered here as the app grows.
app.include_router(public_router)
app.include_router(projects_router)
app.include_router(ai_planning_router)
app.include_router(labor_router)
app.include_router(inventory_router)
app.include_router(versions_router)
app.include_router(subscriptions_router)
app.include_router(b2b_api_router)
