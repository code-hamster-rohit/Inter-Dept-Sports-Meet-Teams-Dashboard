import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from database.config import close_connection, ping_db
from routes.dashboard import router as dashboard_router

load_dotenv()

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8001"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: test MongoDB connection
    is_connected = await ping_db()
    if is_connected:
        print("✓ Connected to MongoDB Atlas successfully.")
    else:
        print("⚠ MongoDB Atlas connection notice: please check network whitelist.")
    yield
    # Shutdown: close client connections
    await close_connection()
    print("✓ Closed database connections.")


app = FastAPI(
    title="Inter-Dept Sports Meet - Teams Dashboard",
    description="Dedicated viewer dashboard for registered department teams in Inter-Dept Sports Meet (IIT Roorkee)",
    version="1.0.0",
    lifespan=lifespan,
)

# Static assets directory with serverless fallback
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_candidates = [
    os.path.join(BASE_DIR, "static"),
    os.path.join(os.getcwd(), "static"),
    os.path.abspath("static"),
]
static_dir = next((p for p in static_candidates if os.path.isdir(p)), None)
if static_dir:
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include dashboard router
app.include_router(dashboard_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
