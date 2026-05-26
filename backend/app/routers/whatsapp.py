from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import httpx

from ..database import get_db
from .. import models
from .auth import get_current_user
from ..config import settings

router = APIRouter()

WA_API = settings.WHATSAPP_API_URL


async def wa_request(method: str, path: str, json: dict = None):
    async with httpx.AsyncClient(timeout=10) as client:
        url = f"{WA_API}{path}"
        if method == "GET":
            r = await client.get(url)
        else:
            r = await client.post(url, json=json)
        return r.json()


@router.get("/status")
async def get_status(current_user: models.Usuario = Depends(get_current_user)):
    try:
        data = await wa_request("GET", "/status")
        return data
    except Exception:
        return {"connected": False, "status": "desconectado", "error": "No se pudo conectar al servicio WhatsApp"}


@router.get("/qr")
async def get_qr(current_user: models.Usuario = Depends(get_current_user)):
    try:
        data = await wa_request("GET", "/qr")
        return data
    except Exception:
        return {"qr": None, "error": "No se pudo obtener el QR"}


@router.post("/send")
async def send_message(
    phone: str,
    message: str,
    current_user: models.Usuario = Depends(get_current_user),
):
    try:
        data = await wa_request("POST", "/send", {"phone": phone, "message": message})
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/aviso-cobro/{cliente_id}")
async def aviso_cobro(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    phone = cliente.telefono_whatsapp or cliente.telefono
    if not phone:
        raise HTTPException(status_code=400, detail="Cliente sin número WhatsApp")

    plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
    nombre = cliente.nombre.split()[0]
    mensaje = (
        f"📶 *TUXTELL* — Aviso de Pago\n\n"
        f"Hola *{nombre}* 👋, le recordamos que su pago mensual está pendiente:\n\n"
        f"📦 Plan: {plan.nombre if plan else 'Internet'}\n"
        f"💰 Monto: *S/ {plan.precio if plan else '---'}*\n\n"
        f"💳 Puede pagar por *Yape* al:\n"
        f"📱 *936511008*\n\n"
        f"Gracias por confiar en *Tuxtell* 🙏"
    )

    try:
        data = await wa_request("POST", "/send", {"phone": phone, "message": mensaje})
        return {"ok": True, "mensaje_enviado": mensaje, "resultado": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/aviso-corte/{cliente_id}")
async def aviso_corte(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    phone = cliente.telefono_whatsapp or cliente.telefono
    if not phone:
        raise HTTPException(status_code=400, detail="Cliente sin número WhatsApp")

    nombre = cliente.nombre.split()[0]
    mensaje = (
        f"⚠️ *TUXTELL* — Aviso de Corte\n\n"
        f"Estimado *{nombre}*, le informamos que su servicio de internet será *suspendido* por falta de pago.\n\n"
        f"Para evitar el corte, realice su pago a la brevedad:\n\n"
        f"💳 *Yape:* 936511008\n"
        f"📞 *Llamadas:* 936511008\n\n"
        f"_Tuxtell — Conectando tu mundo_ 🌐"
    )

    try:
        data = await wa_request("POST", "/send", {"phone": phone, "message": mensaje})
        return {"ok": True, "mensaje_enviado": mensaje, "resultado": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/broadcast-cobros")
async def broadcast_cobros(
    mes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    from datetime import date
    if not mes:
        hoy = date.today()
        mes = f"{hoy.year}-{hoy.month:02d}"

    pagaron = db.query(models.Pago.cliente_id).filter(
        models.Pago.mes_pagado == mes
    ).subquery()

    sin_pago = db.query(models.Cliente).filter(
        models.Cliente.estado == "activo",
        (models.Cliente.telefono_whatsapp.isnot(None)) | (models.Cliente.telefono.isnot(None)),
        ~models.Cliente.id.in_(pagaron),
    ).all()

    enviados = 0
    errores = []

    for cliente in sin_pago:
        phone = cliente.telefono_whatsapp or cliente.telefono
        plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
        nombre = cliente.nombre.split()[0]
        mensaje = (
            f"📶 *TUXTELL* — Recordatorio de Pago\n\n"
            f"Hola *{nombre}* 👋, tiene pendiente el pago del mes *{mes}*:\n\n"
            f"📦 Plan: {plan.nombre if plan else 'Internet'}\n"
            f"💰 Monto: *S/ {plan.precio if plan else '---'}*\n\n"
            f"💳 Pague por *Yape* al *936511008*\n\n"
            f"¡Gracias por su pago! 🙏 — *Tuxtell*"
        )
        try:
            await wa_request("POST", "/send", {"phone": phone, "message": mensaje})
            enviados += 1
        except Exception as e:
            errores.append({"cliente": cliente.nombre, "error": str(e)})

    return {"enviados": enviados, "errores": errores, "mes": mes}
