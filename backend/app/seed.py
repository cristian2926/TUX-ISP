from sqlalchemy.orm import Session
from passlib.context import CryptContext
from . import models
from datetime import date

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_initial_data(db: Session):
    # Seed planes
    if db.query(models.Plan).count() == 0:
        planes = [
            models.Plan(codigo="PLAN01", nombre="Básico 15M", bajada_mbps=15, subida_mbps=6, precio=50.0),
            models.Plan(codigo="PLAN02", nombre="Estándar 20M", bajada_mbps=20, subida_mbps=8, precio=60.0),
            models.Plan(codigo="PLAN03", nombre="Avanzado 30M", bajada_mbps=30, subida_mbps=15, precio=70.0),
            models.Plan(codigo="PLAN04", nombre="Premium 100M", bajada_mbps=100, subida_mbps=10, precio=100.0),
        ]
        db.add_all(planes)
        db.commit()

    # Seed zonas
    if db.query(models.Zona).count() == 0:
        zonas = [
            models.Zona(nombre="Cabanillas", ip_wireguard="10.10.0.2", router_mikrotik="RB-Cabanillas", ip_router="192.168.1.1"),
            models.Zona(nombre="Palca", ip_wireguard="10.10.0.3", router_mikrotik="RB-Palca", ip_router="192.168.2.1"),
            models.Zona(nombre="Paratia", ip_wireguard="10.10.0.4", router_mikrotik="RB-Paratia", ip_router="192.168.3.1"),
        ]
        db.add_all(zonas)
        db.commit()

        # Add sample APs
        zonas_db = db.query(models.Zona).all()
        for zona in zonas_db:
            ap = models.AccessPoint(
                nombre=f"AP-{zona.nombre}-01",
                modelo="Ubiquiti NanoStation M5",
                ip=f"192.168.{zonas_db.index(zona)+1}.10",
                zona_id=zona.id,
                ubicacion=f"Torre principal {zona.nombre}",
            )
            db.add(ap)
        db.commit()

    # Seed admin user
    if db.query(models.Usuario).count() == 0:
        admin = models.Usuario(
            nombre="Administrador",
            email="admin@tuxtell.net",
            hashed_password=pwd_context.hash("admin2024"),
            rol="admin",
        )
        db.add(admin)
        db.commit()
