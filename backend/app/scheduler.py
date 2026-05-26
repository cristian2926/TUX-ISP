import logging
from datetime import date
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="America/Lima")

MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
         "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]


def tarea_diaria():
    from .database import SessionLocal
    from . import models
    from .config import settings

    db = SessionLocal()
    try:
        config = db.query(models.ConfiguracionSistema).filter(
            models.ConfiguracionSistema.id == 1
        ).first()
        if not config or not config.automation_activa:
            return

        hoy = date.today()
        dia = hoy.day
        mes = f"{hoy.year}-{hoy.month:02d}"

        dias_recordatorio = [
            d for d in [
                config.dia_recordatorio_1,
                config.dia_recordatorio_2,
                config.dia_recordatorio_3,
            ] if d is not None
        ]

        if dia in dias_recordatorio:
            logger.info("Automatización: enviando recordatorios (día %d)", dia)
            _broadcast_recordatorio(db, mes, settings)

        if config.dia_corte_automatico and dia == config.dia_corte_automatico:
            logger.info("Automatización: ejecutando corte automático (día %d)", dia)
            _corte_automatico(db, mes, hoy, settings)

    except Exception as e:
        logger.error("Error en tarea diaria: %s", e)
    finally:
        db.close()


def _wa_send(phone: str, message: str, settings):
    try:
        with httpx.Client(timeout=10) as c:
            c.post(f"{settings.WHATSAPP_API_URL}/send", json={"phone": phone, "message": message})
    except Exception as e:
        logger.warning("Error WA a %s: %s", phone, e)


def _broadcast_recordatorio(db, mes: str, settings):
    from . import models

    mes_parts = mes.split("-")
    mes_label = f"{MESES[int(mes_parts[1])]} {mes_parts[0]}"

    pagaron = db.query(models.Pago.cliente_id).filter(
        models.Pago.mes_pagado == mes,
        models.Pago.estado == models.EstadoPago.pagado,
    ).subquery()

    sin_pago = db.query(models.Cliente).filter(
        models.Cliente.estado == models.EstadoCliente.activo,
        (models.Cliente.telefono_whatsapp.isnot(None)) | (models.Cliente.telefono.isnot(None)),
        ~models.Cliente.id.in_(pagaron),
    ).all()

    enviados = 0
    for cliente in sin_pago:
        phone = cliente.telefono_whatsapp or cliente.telefono
        plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
        zona = db.query(models.Zona).filter(models.Zona.id == cliente.zona_id).first()
        nombre = cliente.nombre.split()[0]
        tiendas = f"🏪 *Tiendas autorizadas:*\n{zona.tiendas_pago}\n" if zona and zona.tiendas_pago else ""
        mensaje = (
            f"📶 *TUXTELL* — Recordatorio de Pago\n\n"
            f"Hola *{nombre}* 👋, tiene pendiente el pago de:\n\n"
            f"📅 Mes: *{mes_label}*\n"
            f"📦 Plan: {plan.nombre if plan else 'Internet'}\n"
            f"💰 Monto: *S/ {plan.precio if plan else '---'}*\n\n"
            f"💳 *Formas de pago:*\n"
            f"📱 *Yape / Plin:* 936511008\n"
            f"{tiendas}"
            f"📞 Consultas: 936511008\n\n"
            f"¡Gracias por su pago! 🙏 — *Tuxtell*"
        )
        _wa_send(phone, mensaje, settings)
        enviados += 1

    logger.info("Recordatorios enviados: %d/%d", enviados, len(sin_pago))


def _corte_automatico(db, mes: str, hoy: date, settings):
    from . import models
    from .routers.clientes import _get_wg_ip, _mikrotik_exec

    mes_label = f"{MESES[hoy.month]} {hoy.year}"

    pagaron = db.query(models.Pago.cliente_id).filter(
        models.Pago.mes_pagado == mes,
        models.Pago.estado == models.EstadoPago.pagado,
    ).subquery()

    # Solo corta si fecha_vencimiento es nula o ya venció
    a_cortar = db.query(models.Cliente).filter(
        models.Cliente.estado == models.EstadoCliente.activo,
        ~models.Cliente.id.in_(pagaron),
        (models.Cliente.fecha_vencimiento.is_(None)) | (models.Cliente.fecha_vencimiento < hoy),
    ).all()

    cortados = 0
    for cliente in a_cortar:
        try:
            cliente.estado = models.EstadoCliente.suspendido
            db.add(models.Historial(
                cliente_id=cliente.id,
                tipo=models.TipoHistorial.corte,
                descripcion="Corte automático por falta de pago",
            ))
            db.commit()

            # WhatsApp primero
            phone = cliente.telefono_whatsapp or cliente.telefono
            if phone:
                plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
                zona = db.query(models.Zona).filter(models.Zona.id == cliente.zona_id).first()
                nombre = cliente.nombre.split()[0]
                tiendas = f"🏪 *Tiendas autorizadas:*\n{zona.tiendas_pago}\n" if zona and zona.tiendas_pago else ""
                msg = (
                    f"🔴 *TUXTELL* — Servicio Suspendido\n\n"
                    f"Estimado *{nombre}*, su servicio ha sido *suspendido* por falta de pago.\n\n"
                    f"📅 Mes pendiente: *{mes_label}*\n"
                    f"💰 Monto: *S/ {plan.precio if plan else '---'}*\n\n"
                    f"Para reactivar su servicio:\n"
                    f"📱 *Yape / Plin:* 936511008\n"
                    f"{tiendas}"
                    f"📞 *Llamadas:* 936511008\n\n"
                    f"_Tuxtell — Conectando tu mundo_ 🌐"
                )
                _wa_send(phone, msg, settings)

            # Luego corte en MikroTik
            wg_ip = _get_wg_ip(db, cliente.zona_id)
            if wg_ip:
                cmds = []
                if cliente.ip_estatica:
                    cmds.append(
                        f'/ip firewall address-list add list=CORTE-MOROSO '
                        f'address={cliente.ip_estatica} comment="{cliente.usuario_pppoe}"'
                    )
                cmds.append(f'/ppp active remove [find name="{cliente.usuario_pppoe}"]')
                _mikrotik_exec(wg_ip, cmds)

            cortados += 1
        except Exception as e:
            logger.error("Error cortando cliente %d: %s", cliente.id, e)

    logger.info("Corte automático: %d clientes suspendidos", cortados)


def start_scheduler():
    scheduler.add_job(
        tarea_diaria,
        CronTrigger(hour=8, minute=0),
        id="tarea_diaria",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — tarea diaria a las 08:00 Lima")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler detenido")
