from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import Optional
from datetime import date, timedelta
import calendar
import threading
import httpx
import logging

from ..database import get_db
from .. import models, schemas
from .auth import get_current_user
from ..config import settings

logger = logging.getLogger(__name__)


def _sumar_un_mes(d: date) -> date:
    """Avanza exactamente un mes respetando días al final de mes (ej: 31 ene → 28/29 feb)."""
    mes = d.month % 12 + 1
    anio = d.year + (1 if d.month == 12 else 0)
    dia = min(d.day, calendar.monthrange(anio, mes)[1])
    return date(anio, mes, dia)


def _enviar_confirmacion_pago(cliente: models.Cliente, pago: models.Pago, plan: models.Plan):
    """Envía confirmación de pago por WhatsApp. No lanza excepciones."""
    phone = (cliente.telefono_whatsapp or cliente.telefono or "").strip()
    if not phone:
        logger.warning("WhatsApp pago omitido — cliente %d sin número de teléfono", cliente.id)
        return

    anio, mes = map(int, pago.mes_pagado.split("-"))
    if cliente.fecha_vencimiento:
        fecha_limite = cliente.fecha_vencimiento.strftime("%d/%m/%Y")
    else:
        ultimo_dia = calendar.monthrange(anio, mes)[1]
        fecha_limite = f"{ultimo_dia:02d}/{mes:02d}/{anio}"

    nombres = cliente.nombre.split()[0]
    plan_nombre = plan.nombre if plan else "Internet"
    monto = f"{pago.monto:.2f}"
    mes_nombres = [
        "", "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ]
    mes_label = f"{mes_nombres[mes]} {anio}"

    mensaje = (
        f"✅ *TUXTELL* — Pago Confirmado\n\n"
        f"Hola *{nombres}* 🎉, tu pago fue registrado exitosamente:\n\n"
        f"📅 Mes: *{mes_label}*\n"
        f"💰 Monto: *S/ {monto}*\n"
        f"📶 Plan: {plan_nombre}\n"
        f"📆 Activo hasta: *{fecha_limite}*\n\n"
        f"¡Gracias por tu pago puntual! 🙏\n"
        f"_Tuxtell — Conectando tu mundo_ 🌐"
    )

    logger.info("WhatsApp pago: enviando a %s (cliente %d)", phone, cliente.id)

    def _enviar():
        try:
            with httpx.Client(timeout=10) as http:
                r = http.post(
                    f"{settings.WHATSAPP_API_URL}/send",
                    json={"phone": phone, "message": mensaje},
                )
                if r.status_code == 200:
                    logger.info("WhatsApp pago enviado OK a %s", phone)
                else:
                    logger.warning("WhatsApp pago falló HTTP %d a %s: %s", r.status_code, phone, r.text[:200])
        except Exception as e:
            logger.warning("WhatsApp pago excepción a %s: %s", phone, e)

    threading.Thread(target=_enviar, daemon=True).start()

router = APIRouter()


@router.get("", response_model=dict)
def list_pagos(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    cliente_id: Optional[int] = None,
    mes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    query = db.query(models.Pago).options(joinedload(models.Pago.cliente))

    if cliente_id:
        query = query.filter(models.Pago.cliente_id == cliente_id)
    if mes:
        query = query.filter(models.Pago.mes_pagado == mes)

    query = query.order_by(models.Pago.fecha_pago.desc())
    total = query.count()
    pagos = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "items": [schemas.PagoOut.model_validate(p) for p in pagos],
    }


@router.post("", response_model=schemas.PagoOut, status_code=201)
def create_pago(
    data: schemas.PagoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == data.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Check duplicate
    existing = db.query(models.Pago).filter(
        models.Pago.cliente_id == data.cliente_id,
        models.Pago.mes_pagado == data.mes_pagado,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un pago para {data.mes_pagado}")

    pago = models.Pago(**data.model_dump(), registrado_por=current_user.id)
    db.add(pago)

    # Solo reactivar si es un pago real (no corte_temporal)
    if data.estado == models.EstadoPago.pagado and cliente.estado == models.EstadoCliente.suspendido:
        cliente.estado = models.EstadoCliente.activo
        historial = models.Historial(
            cliente_id=cliente.id,
            tipo=models.TipoHistorial.activacion,
            descripcion=f"Reactivado automáticamente por pago del mes {data.mes_pagado}",
            usuario_id=current_user.id,
        )
        db.add(historial)

    historial_pago = models.Historial(
        cliente_id=cliente.id,
        tipo=models.TipoHistorial.pago,
        descripcion=f"Pago registrado: S/{data.monto} - Mes {data.mes_pagado} - Método: {data.metodo_pago}",
        usuario_id=current_user.id,
    )
    db.add(historial_pago)

    # Solo actualizar fecha_vencimiento para pagos reales, no cortes temporales
    if data.estado == models.EstadoPago.pagado:
        anio_p, mes_p = map(int, data.mes_pagado.split("-"))
        next_mes  = mes_p % 12 + 1
        next_anio = anio_p + (1 if mes_p == 12 else 0)
        dia_ciclo = cliente.fecha_instalacion.day if cliente.fecha_instalacion else 1
        dia_ciclo = min(dia_ciclo, calendar.monthrange(next_anio, next_mes)[1])
        nueva_vencimiento = date(next_anio, next_mes, dia_ciclo)
        # Nunca retroceder si ya hay una fecha posterior (pagos de meses atrasados)
        cliente.fecha_vencimiento = max(nueva_vencimiento, cliente.fecha_vencimiento or date.today())

    db.commit()
    db.refresh(pago)
    db.refresh(cliente)

    # Notificación WhatsApp — no bloqueante, falla silenciosa
    plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
    _enviar_confirmacion_pago(cliente, pago, plan)

    return pago


@router.get("/resumen-mensual")
def resumen_mensual(
    anio: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    if not anio:
        anio = date.today().year

    result = []
    for mes in range(1, 13):
        mes_str = f"{anio}-{mes:02d}"
        total = db.query(func.sum(models.Pago.monto)).filter(
            models.Pago.mes_pagado == mes_str,
            models.Pago.estado == models.EstadoPago.pagado,
        ).scalar() or 0

        gastos = db.query(func.sum(models.Gasto.monto)).filter(
            extract("year", models.Gasto.fecha) == anio,
            extract("month", models.Gasto.fecha) == mes,
        ).scalar() or 0

        result.append({
            "mes": mes_str,
            "ingresos": float(total),
            "gastos": float(gastos),
        })

    return result


@router.get("/clientes-sin-pago")
def clientes_sin_pago(
    mes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    if not mes:
        hoy = date.today()
        mes = f"{hoy.year}-{hoy.month:02d}"

    pagaron = db.query(models.Pago.cliente_id).filter(
        models.Pago.mes_pagado == mes
    ).subquery()

    sin_pago = db.query(models.Cliente).options(
        joinedload(models.Cliente.zona),
        joinedload(models.Cliente.plan),
    ).filter(
        models.Cliente.estado == models.EstadoCliente.activo,
        ~models.Cliente.id.in_(pagaron),
    ).all()

    return [schemas.ClienteListItem.model_validate(c) for c in sin_pago]


@router.delete("/{pago_id}")
def delete_pago(
    pago_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    pago = db.query(models.Pago).filter(models.Pago.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    db.delete(pago)
    db.commit()
    return {"ok": True}
