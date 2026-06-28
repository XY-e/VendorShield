from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from utils.seed import seed
from scheduler.jobs import start_scheduler
from routes import companies, data_routes, insights, ai_features, advanced


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed()
    scheduler = start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(title="Vendor Risk Intelligence API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router)
app.include_router(data_routes.router)
app.include_router(insights.router)
app.include_router(ai_features.router)
app.include_router(advanced.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
