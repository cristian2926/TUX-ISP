from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List
from datetime import date
import logging
import re

import paramiko
import httpx
from datetime import date

from ..database import get_db
from .. import models, schemas
from .auth import get_current_user
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ── SSH MikroTik ──────────────────────────────────────────────────────────────

def _mikrotik_exec(host: str, commands: list[str]) -> dict:
    """
    SSH al MikroTik en {host} (IP WireGuard) y ejecuta cada comando RouterOS.
    Retorna {"ok": bool, "results": [...], "error": str}.
    Nunca lanza excepción — el cliente se guarda en BD aunque falle MikroTik.
    """
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=host,
            username=settings.SSH_USER,
            key_filename=settings.SSH_KEY_PATH,
            timeout=10,
            look_for_keys=False,
            allow_agent=False,
        )
        results = []
        for cmd in commands:
            try:
                _, stdout, stderr = ssh.exec_command(cmd, timeout=10)
                results.append({
                    "cmd": cmd,
                    "out": stdout.read().decode(errors="ignore").strip(),
                    "err": stderr.read().decode(errors="ignore").strip(),
                    "rc": stdout.channel.recv_exit_status(),
                })
            except Exception as e:
                results.append({"cmd": cmd, "err": str(e), "rc": -1})
        ssh.close()
        return {"ok": True, "results": results}
    except Exception as e:
        logger.warning("MikroTik SSH %s falló: %s", host, e)
        return {"ok": False, "error": str(e), "results": []}


MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

def _wa_send(phone: str, message: str):
    try:
        with httpx.Client(timeout=8) as c:
            c.post(f"{settings.WHATSAPP_API_URL}/send", json={"phone": phone, "message": message})
    except Exception as e:
        logger.warning("WhatsApp send falló: %s", e)


def _get_wg_ip(db: Session, zona_id: int) -> Optional[str]:
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    return zona.ip_wireguard if zona else None


# ── Listado ───────────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
def list_clientes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    zona_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    query = db.query(models.Cliente).options(
        joinedload(models.Cliente.zona),
        joinedload(models.Cliente.plan),
    )

    if search:
        query = query.filter(
            or_(
                models.Cliente.nombre.ilike(f"%{search}%"),
                models.Cliente.usuario_pppoe.ilike(f"%{search}%"),
                models.Cliente.telefono.ilike(f"%{search}%"),
                models.Cliente.ip_estatica.ilike(f"%{search}%"),
            )
        )
    if zona_id:
        query = query.filter(models.Cliente.zona_id == zona_id)
    if estado:
        query = query.filter(models.Cliente.estado == estado)

    total = query.count()
    clientes = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "items": [schemas.ClienteListItem.model_validate(c) for c in clientes],
    }


# ── Crear cliente + MikroTik ──────────────────────────────────────────────────

@router.post("", status_code=201)
def create_cliente(
    data: schemas.ClienteCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    if db.query(models.Cliente).filter(models.Cliente.usuario_pppoe == data.usuario_pppoe).first():
        raise HTTPException(status_code=400, detail="Usuario PPPoE ya existe")

    from datetime import timedelta
    dump = data.model_dump()
    if not dump.get("fecha_vencimiento"):
        dump["fecha_vencimiento"] = dump["fecha_instalacion"] + timedelta(days=30)
    dump["fecha_ultima_activacion"] = dump["fecha_instalacion"]
    cliente = models.Cliente(**dump)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    historial = models.Historial(
        cliente_id=cliente.id,
        tipo=models.TipoHistorial.activacion,
        descripcion=f"Cliente registrado. Plan: {cliente.plan_id}. Usuario PPPoE: {cliente.usuario_pppoe}",
        usuario_id=current_user.id,
    )
    db.add(historial)
    db.commit()

    # Obtener datos relacionados para la respuesta
    cliente_full = db.query(models.Cliente).options(
        joinedload(models.Cliente.zona),
        joinedload(models.Cliente.plan),
    ).filter(models.Cliente.id == cliente.id).first()

    # ── Sync MikroTik ──
    mt_result = {"ok": False, "error": "Zona sin IP WireGuard"}
    wg_ip = _get_wg_ip(db, cliente.zona_id)
    if wg_ip:
        plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
        perfil = plan.codigo if plan else "default"
        ip_remote = cliente.ip_estatica if cliente.ip_estatica else "0.0.0.0"
        nombre_safe = cliente.nombre.replace('"', "'")
        cmd = (
            f'/ppp secret add name="{cliente.usuario_pppoe}" '
            f'password="{cliente.password_pppoe}" '
            f'profile="{perfil}" '
            f'remote-address={ip_remote} '
            f'service=pppoe '
            f'comment="{nombre_safe}"'
        )
        mt_result = _mikrotik_exec(wg_ip, [cmd])

    return {
        "cliente": schemas.ClienteOut.model_validate(cliente_full).model_dump(mode="json"),
        "mikrotik_ok": mt_result["ok"],
        "mikrotik_msg": mt_result.get("error", "Sincronizado correctamente"),
    }


# ── Obtener cliente ───────────────────────────────────────────────────────────

@router.get("/{cliente_id}", response_model=schemas.ClienteOut)
def get_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).options(
        joinedload(models.Cliente.zona),
        joinedload(models.Cliente.plan),
    ).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


# ── Actualizar cliente ────────────────────────────────────────────────────────

@router.put("/{cliente_id}", response_model=schemas.ClienteOut)
def update_cliente(
    cliente_id: int,
    data: schemas.ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    cmds = []
    wg_ip = _get_wg_ip(db, cliente.zona_id)

    if "password_pppoe" in update_data:
        cmds.append(f'/ppp secret set [find name="{cliente.usuario_pppoe}"] password="{update_data["password_pppoe"]}"')

    if "plan_id" in update_data:
        plan = db.query(models.Plan).filter(models.Plan.id == update_data["plan_id"]).first()
        if plan:
            cmds.append(f'/ppp secret set [find name="{cliente.usuario_pppoe}"] profile="{plan.codigo}"')

    if cmds and wg_ip:
        _mikrotik_exec(wg_ip, cmds)

    for key, value in update_data.items():
        setattr(cliente, key, value)

    db.commit()
    db.refresh(cliente)
    return db.query(models.Cliente).options(
        joinedload(models.Cliente.zona),
        joinedload(models.Cliente.plan),
    ).filter(models.Cliente.id == cliente_id).first()


# ── Eliminar cliente + MikroTik ───────────────────────────────────────────────

@router.delete("/{cliente_id}")
def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = cliente.usuario_pppoe
    wg_ip = _get_wg_ip(db, cliente.zona_id)

    # Eliminar registros relacionados primero
    db.query(models.Historial).filter(models.Historial.cliente_id == cliente_id).delete()
    db.query(models.Pago).filter(models.Pago.cliente_id == cliente_id).delete()
    db.delete(cliente)
    db.commit()

    # Eliminar secreto PPPoE del MikroTik
    mt_result = {"ok": False}
    if wg_ip:
        cmd = f'/ppp secret remove [find name="{usuario}"]'
        mt_result = _mikrotik_exec(wg_ip, [cmd])

    return {"ok": True, "mikrotik_ok": mt_result["ok"]}


# ── Cortar servicio + MikroTik ────────────────────────────────────────────────

@router.post("/{cliente_id}/cortar")
def cortar_servicio(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    cliente.estado = models.EstadoCliente.suspendido
    historial = models.Historial(
        cliente_id=cliente.id,
        tipo=models.TipoHistorial.corte,
        descripcion="Servicio cortado por administrador",
        usuario_id=current_user.id,
    )
    db.add(historial)
    db.commit()

    # WhatsApp primero — cliente lo recibe mientras aún tiene internet
    phone = cliente.telefono_whatsapp or cliente.telefono
    if phone:
        plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
        zona = db.query(models.Zona).filter(models.Zona.id == cliente.zona_id).first()
        nombre = cliente.nombre.split()[0]
        hoy = date.today()
        mes_label = f"{MESES[hoy.month]} {hoy.year}"
        tiendas = f"🏪 *Tiendas autorizadas:*\n{zona.tiendas_pago}\n" if zona and zona.tiendas_pago else ""
        msg = (
            f"🔴 *TUXTELL* — Servicio Suspendido\n\n"
            f"Estimado *{nombre}*, su servicio de internet ha sido *suspendido* por falta de pago.\n\n"
            f"📅 Mes pendiente: *{mes_label}*\n"
            f"💰 Monto: *S/ {plan.precio if plan else '---'}*\n\n"
            f"Para reactivar su servicio:\n"
            f"📱 *Yape / Plin:* 936511008\n"
            f"{tiendas}"
            f"📞 *Llamadas:* 936511008\n\n"
            f"_Tuxtell — Conectando tu mundo_ 🌐"
        )
        _wa_send(phone, msg)

    # Bloquear en MikroTik después del WhatsApp
    mt_result = {"ok": False}
    wg_ip = _get_wg_ip(db, cliente.zona_id)
    if wg_ip:
        cmds = []
        if cliente.ip_estatica:
            cmds.append(
                f'/ip firewall address-list add list=CORTE-MOROSO '
                f'address={cliente.ip_estatica} comment="{cliente.usuario_pppoe}"'
            )
        cmds.append(
            f'/ppp active remove [find name="{cliente.usuario_pppoe}"]'
        )
        mt_result = _mikrotik_exec(wg_ip, cmds)

    return {"ok": True, "estado": "suspendido", "mikrotik_ok": mt_result["ok"]}


# ── Reactivar servicio + MikroTik ─────────────────────────────────────────────

@router.post("/{cliente_id}/reactivar")
def reactivar_servicio(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    from datetime import timedelta
    hoy = date.today()
    cliente.estado = models.EstadoCliente.activo
    cliente.fecha_vencimiento = hoy + timedelta(days=30)
    cliente.fecha_ultima_activacion = hoy
    historial = models.Historial(
        cliente_id=cliente.id,
        tipo=models.TipoHistorial.activacion,
        descripcion=f"Servicio reactivado — nueva fecha de vencimiento: {cliente.fecha_vencimiento.strftime('%d/%m/%Y')}",
        usuario_id=current_user.id,
    )
    db.add(historial)
    db.commit()

    # Desbloquear en MikroTik
    mt_result = {"ok": False}
    wg_ip = _get_wg_ip(db, cliente.zona_id)
    if wg_ip and cliente.ip_estatica:
        cmd = (
            f'/ip firewall address-list remove '
            f'[find where list=CORTE-MOROSO address={cliente.ip_estatica}]'
        )
        mt_result = _mikrotik_exec(wg_ip, [cmd])
    elif wg_ip:
        mt_result = {"ok": True}  # Sin IP estática no hay nada que remover

    # WhatsApp automático
    phone = cliente.telefono_whatsapp or cliente.telefono
    if phone:
        plan = db.query(models.Plan).filter(models.Plan.id == cliente.plan_id).first()
        nombre = cliente.nombre.split()[0]
        msg = (
            f"✅ *TUXTELL* — Servicio Reactivado\n\n"
            f"Hola *{nombre}* 🎉, su servicio de internet ha sido *reactivado* exitosamente.\n\n"
            f"📶 Plan: *{plan.nombre if plan else 'Internet'}*\n"
            f"🌐 Ya puede navegar con normalidad.\n\n"
            f"¡Gracias por su pago! 🙏\n"
            f"_Tuxtell — Conectando tu mundo_ 🌐"
        )
        _wa_send(phone, msg)

    return {"ok": True, "estado": "activo", "mikrotik_ok": mt_result["ok"]}


# ── Historial ─────────────────────────────────────────────────────────────────

@router.get("/{cliente_id}/historial", response_model=List[schemas.HistorialOut])
def get_historial(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Historial).filter(
        models.Historial.cliente_id == cliente_id
    ).order_by(models.Historial.creado_en.desc()).all()


# ── Calendario de pagos ───────────────────────────────────────────────────────

@router.get("/{cliente_id}/calendario-pagos")
def get_calendario_pagos(
    cliente_id: int,
    anio: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    hoy = date.today()
    if not anio:
        anio = hoy.year

    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    pagos = db.query(models.Pago).filter(
        models.Pago.cliente_id == cliente_id,
        models.Pago.mes_pagado.like(f"{anio}-%"),
    ).all()

    pagos_dict = {p.mes_pagado: p.estado for p in pagos}
    calendario = []
    instalacion = cliente.fecha_instalacion.replace(day=1) if cliente.fecha_instalacion else None

    for mes in range(1, 13):
        mes_str = f"{anio}-{mes:02d}"
        mes_date = date(anio, mes, 1)

        if instalacion and mes_date < instalacion:
            estado = "no_aplica"
        elif mes_date > hoy.replace(day=1):
            estado = "futuro"
        elif mes_str in pagos_dict:
            estado = str(pagos_dict[mes_str])
        else:
            estado = "vencido" if mes_date < hoy.replace(day=1) else "pendiente"

        calendario.append({"mes": mes_str, "estado": estado})

    return calendario


# ── Estado PPPoE en tiempo real ───────────────────────────────────────────────

@router.get("/{cliente_id}/pppoe-status")
def get_pppoe_status(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).options(
        joinedload(models.Cliente.zona)
    ).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    zona = cliente.zona
    if not zona or not zona.ip_wireguard:
        return {"conectado": False, "uptime": None, "ip_remota": None, "error": "Zona sin WireGuard"}

    result = _mikrotik_exec(zona.ip_wireguard, [
        f'/ppp active print detail where name="{cliente.usuario_pppoe}"'
    ])

    if not result["ok"]:
        return {"conectado": False, "uptime": None, "ip_remota": None, "error": "Sin conexión al MikroTik"}

    output = result["results"][0]["out"] if result["results"] else ""
    conectado = bool(output.strip())

    uptime = None
    ip_remota = None
    if conectado:
        m = re.search(r'uptime=(\S+)', output)
        if m:
            uptime = m.group(1)
        m = re.search(r'\baddress=(\S+)', output)
        if m:
            ip_remota = m.group(1)

    return {"conectado": conectado, "uptime": uptime, "ip_remota": ip_remota, "error": None}
