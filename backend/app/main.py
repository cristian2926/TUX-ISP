from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from . import models
from .routers import clientes, zonas, pagos, gastos, auth, whatsapp, dashboard, planes, admin, cliente_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    from .seed import seed_initial_data
    from .database import SessionLocal
    from .scheduler import init_scheduler, stop_scheduler
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    init_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="TUX-ISP API",
    description="Sistema de gestión para ISP Tuxtell",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tuxtell.duckdns.org",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(clientes.router, prefix="/api/clientes", tags=["Clientes"])
app.include_router(zonas.router, prefix="/api/zonas", tags=["Zonas"])
app.include_router(pagos.router, prefix="/api/pagos", tags=["Pagos"])
app.include_router(gastos.router, prefix="/api/gastos", tags=["Gastos"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp"])
app.include_router(planes.router, prefix="/api/planes", tags=["Planes"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(cliente_app.router, prefix="/api/cliente", tags=["App Cliente"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "TUX-ISP", "version": "1.0.0"}
