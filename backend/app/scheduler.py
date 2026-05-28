import logging
from datetime import date, timedelta

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from . import models
from .config import settings
from .database import SessionLocal

logger = logging.getLogger(__name__)

MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
         "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]


async def job_recordatorio_preventivo(dias_antes: int = 3):
    db: Session = SessionLocal()
    try:
        hoy = date.today()
        fecha_objetivo = hoy + timedelta(days=dias_antes)
        mes_actual = f"{hoy.year}-{hoy.month:02d}"

        pagaron = db.query(models.Pago.cliente_id).filter(
            models.Pago.mes_pagado == mes_actual,
            models.Pago.estado == models.EstadoPago.pagado,
        ).subquery()

        clientes = db.query(models.Cliente).filter(
            models.Cliente.estado == models.EstadoCliente.activo,
            models.Cliente.fecha_vencimiento == fecha_objetivo,
            (models.Cliente.telefono_whatsapp.isnot(None)) | (models.Cliente.telefono.isnot(None)),
            ~models.Cliente.id.in_(pagaron),
        ).all()

        enviados = 0
        for cliente in clientes:
            phone = cliente.telefono_whatsapp or cliente.telefono
            plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
            zona = db.query(models.Zona).filter(models.Zona.id == cliente.zona_id).first()
            nombre = cliente.nombre.split()[0]
            tiendas = f"🏪 *Tiendas autorizadas:*\n{zona.tiendas_pago}\n" if zona and zona.tiendas_pago else ""
            mensaje = (
                f"📅 *TUXTELL* — Recordatorio de Pago\n\n"
                f"Hola *{nombre}* 👋, le recordamos que su servicio vence en *{dias_antes} días* "
                f"({fecha_objetivo.strftime('%d/%m/%Y')}).\n\n"
                f"📦 Plan: {plan.nombre if plan else 'Internet'}\n"
                f"💰 Monto: *S/ {plan.precio if plan else '---'}*\n\n"
                f"💳 *Formas de pago:*\n"
                f"📱 *Yape / Plin:* {settings.PHONE_CONTACTO}\n"
                f"{tiendas}"
                f"📞 Consultas: {settings.PHONE_CONTACTO}\n\n"
                f"¡Gracias por su pago! 🙏 — *Tuxtell*"
            )
            try:
                async with httpx.AsyncClient(timeout=8) as c:
                    await c.post(f"{settings.WHATSAPP_API_URL}/send", json={"phone": phone, "message": mensaje})
                enviados += 1
            except Exception as e:
                logger.warning("Recordatorio falló para %s: %s", cliente.nombre, e)

        logger.info("Recordatorios preventivos: %d enviados de %d clientes", enviados, len(clientes))
        return {"enviados": enviados, "total": len(clientes)}
    finally:
        db.close()


scheduler = AsyncIOScheduler(timezone="America/Lima")


def init_scheduler():
    scheduler.add_job(
        job_recordatorio_preventivo,
        CronTrigger(hour=8, minute=0, timezone="America/Lima"),
        id="recordatorio_preventivo",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — recordatorio diario a las 08:00 hora Lima")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
