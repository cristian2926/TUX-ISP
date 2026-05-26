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
        mes = f"{hoy.year}-{hoy.month:02d}"

        # Clientes activos que no pagaron este mes
        pagaron = db.query(models.Pago.cliente_id).filter(
            models.Pago.mes_pagado == mes,
            models.Pago.estado == models.EstadoPago.pagado,
        ).subquery()

        clientes_sin_pago = db.query(models.Cliente).filter(
            models.Cliente.estado == models.EstadoCliente.activo,
            models.Cliente.fecha_vencimiento.isnot(None),
            ~models.Cliente.id.in_(pagaron),
        ).all()

        dias_aviso = [
            d for d in [config.dias_aviso_1, config.dias_aviso_2, config.dias_aviso_3]
            if d is not None
        ]
        dias_gracia = config.dias_gracia if config.dias_gracia is not None else 3

        for cliente in clientes_sin_pago:
            dias_restantes = (cliente.fecha_vencimiento - hoy).days

            # Avisos: X días antes del vencimiento
            if dias_restantes in dias_aviso:
                logger.info("Aviso a %s: vence en %d días", cliente.nombre, dias_restantes)
                _enviar_aviso_vencimiento(cliente, db, hoy, dias_restantes, settings)

            # Corte: cuando ya pasaron los días de gracia
            elif dias_restantes <= -dias_gracia:
                logger.info("Corte automático a %s: venció hace %d días", cliente.nombre, abs(dias_restantes))
                _cortar_cliente(cliente, db, hoy, settings)

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


def _enviar_aviso_vencimiento(cliente, db, hoy, dias_restantes, settings):
    from . import models

    phone = cliente.telefono_whatsapp or cliente.telefono
    if not phone:
        return

    plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
    zona = db.query(models.Zona).filter(models.Zona.id == cliente.zona_id).first()
    nombre = cliente.nombre.split()[0]
    tiendas = f"🏪 *Tiendas autorizadas:*\n{zona.tiendas_pago}\n" if zona and zona.tiendas_pago else ""

    if dias_restantes == 0:
        tiempo_str = "*hoy vence* su servicio"
    elif dias_restantes == 1:
        tiempo_str = "su servicio vence *mañana*"
    else:
        tiempo_str = f"su servicio vence en *{dias_restantes} días*"

    mensaje = (
        f"⏰ *TUXTELL* — Servicio por Vencer\n\n"
        f"Hola *{nombre}* 👋, le recordamos que {tiempo_str}.\n\n"
        f"📅 Vencimiento: *{cliente.fecha_vencimiento.strftime('%d/%m/%Y')}*\n"
        f"📦 Plan: {plan.nombre if plan else 'Internet'}\n"
        f"💰 Monto: *S/ {plan.precio if plan else '---'}*\n\n"
        f"Realice su pago antes de la fecha para no perder el servicio:\n"
        f"📱 *Yape / Plin:* 936511008\n"
        f"{tiendas}"
        f"📞 Consultas: 936511008\n\n"
        f"¡Gracias por su pago! 🙏 — *Tuxtell*"
    )
    _wa_send(phone, mensaje, settings)


def _cortar_cliente(cliente, db, hoy, settings):
    from . import models
    from .routers.clientes import _get_wg_ip, _mikrotik_exec

    try:
        cliente.estado = models.EstadoCliente.suspendido
        db.add(models.Historial(
            cliente_id=cliente.id,
            tipo=models.TipoHistorial.corte,
            descripcion=f"Corte automático — venció el {cliente.fecha_vencimiento.strftime('%d/%m/%Y')}",
        ))
        db.commit()

        # WhatsApp primero
        phone = cliente.telefono_whatsapp or cliente.telefono
        if phone:
            plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
            zona = db.query(models.Zona).filter(models.Zona.id == cliente.zona_id).first()
            nombre = cliente.nombre.split()[0]
            mes_label = f"{MESES[hoy.month]} {hoy.year}"
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

        # Luego MikroTik
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

    except Exception as e:
        logger.error("Error cortando cliente %d: %s", cliente.id, e)


def start_scheduler():
    scheduler.add_job(
        tarea_diaria,
        CronTrigger(hour=0, minute=5),  # 00:05 Lima — justo después de medianoche
        id="tarea_diaria",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — tarea diaria a las 00:05 Lima")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler detenido")
