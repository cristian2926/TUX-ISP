from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import subprocess
import re
import socket
import logging
from datetime import datetime

import paramiko
from pydantic import BaseModel

from ..database import get_db
from .. import models, schemas
from .auth import get_current_user
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Utilidades de red ─────────────────────────────────────────────────────────

def ping_host(ip: str, timeout: int = 2) -> bool:
    try:
        result = subprocess.run(
            ["ping", "-c", "1", "-W", str(timeout), ip],
            capture_output=True, timeout=timeout + 2,
        )
        return result.returncode == 0
    except Exception:
        return False


def check_ssh_port(host: str, port: int = 22, timeout: int = 3) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


# ── WireGuard helpers ─────────────────────────────────────────────────────────

def wg_show_dump() -> list[dict]:
    """
    Parsea `wg show wg0 dump`.
    Retorna lista de peers con: pubkey, endpoint, allowed_ips,
    last_handshake (epoch), rx_bytes, tx_bytes.
    """
    try:
        out = subprocess.check_output(
            ["wg", "show", "wg0", "dump"],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode()
    except Exception as e:
        logger.warning("wg show dump falló: %s", e)
        return []

    peers = []
    lines = out.strip().splitlines()
    for line in lines[1:]:   # primera línea = interface
        parts = line.split("\t")
        if len(parts) < 8:
            continue
        pubkey, _psk, endpoint, allowed_ips, last_hs, rx, tx, _ka = parts[:8]
        peers.append({
            "pubkey": pubkey,
            "endpoint": endpoint if endpoint != "(none)" else None,
            "allowed_ips": allowed_ips,
            "last_handshake": int(last_hs),
            "rx_bytes": int(rx),
            "tx_bytes": int(tx),
            "online": int(last_hs) > 0 and (
                (datetime.utcnow().timestamp() - int(last_hs)) < 180
            ),
        })
    return peers


def wg_peer_status(pubkey: str) -> Optional[dict]:
    """Retorna el estado del peer con esa clave pública, o None si no existe."""
    for p in wg_show_dump():
        if p["pubkey"] == pubkey:
            return p
    return None


def wg_add_peer(pubkey: str, allowed_ips: str, comment: str = "") -> dict:
    """Agrega peer al wg0.conf y aplica con wg set."""
    conf_path = settings.WG_CONFIG_PATH

    # Leer config actual
    try:
        with open(conf_path, "r") as f:
            content = f.read()
    except FileNotFoundError:
        return {"ok": False, "error": f"No se encontró {conf_path}"}

    if pubkey in content:
        return {"ok": False, "error": "Este peer ya existe en la configuración"}

    # Construir bloque [Peer]
    block = "\n[Peer]\n"
    if comment:
        block += f"# {comment}\n"
    block += f"PublicKey = {pubkey}\n"
    block += f"AllowedIPs = {allowed_ips}\n"
    block += "PersistentKeepalive = 25\n"

    try:
        with open(conf_path, "a") as f:
            f.write(block)
    except Exception as e:
        return {"ok": False, "error": f"Error escribiendo config: {e}"}

    # Aplicar sin reiniciar
    ips_clean = allowed_ips.replace(" ", "")
    try:
        subprocess.run(
            ["wg", "set", "wg0", "peer", pubkey, "allowed-ips", ips_clean],
            check=True, timeout=5,
        )
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": f"wg set falló: {e}"}


def wg_remove_peer(pubkey: str) -> dict:
    """Elimina peer de wg0.conf y de la interfaz activa."""
    conf_path = settings.WG_CONFIG_PATH

    try:
        with open(conf_path, "r") as f:
            content = f.read()
    except FileNotFoundError:
        return {"ok": False, "error": f"No se encontró {conf_path}"}

    if pubkey not in content:
        return {"ok": False, "error": "Peer no encontrado en la configuración"}

    # Eliminar el bloque [Peer] que contiene esta pubkey
    sections = re.split(r"\n(?=\[)", content)
    new_sections = [s for s in sections if pubkey not in s]
    new_content = "\n".join(new_sections)

    try:
        with open(conf_path, "w") as f:
            f.write(new_content)
    except Exception as e:
        return {"ok": False, "error": f"Error escribiendo config: {e}"}

    try:
        subprocess.run(
            ["wg", "set", "wg0", "peer", pubkey, "remove"],
            check=True, timeout=5,
        )
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": f"wg set remove falló: {e}"}


def _zona_to_dict(zona, db: Session) -> dict:
    total = db.query(models.Cliente).filter(models.Cliente.zona_id == zona.id).count()
    activos = db.query(models.Cliente).filter(
        models.Cliente.zona_id == zona.id,
        models.Cliente.estado == "activo",
    ).count()
    aps = db.query(models.AccessPoint).filter(models.AccessPoint.zona_id == zona.id).all()

    return {
        "id": zona.id,
        "nombre": zona.nombre,
        "ip_wireguard": zona.ip_wireguard,
        "ip_lan": zona.ip_lan,
        "usuario_mikrotik": zona.usuario_mikrotik,
        "password_mikrotik": zona.password_mikrotik,
        "wg_public_key": zona.wg_public_key,
        "router_mikrotik": zona.router_mikrotik,
        "ip_router": zona.ip_router,
        "descripcion": zona.descripcion,
        "tiendas_pago": zona.tiendas_pago,
        "activo": zona.activo,
        "total_clientes": total,
        "clientes_activos": activos,
        "access_points": [
            {
                "id": ap.id,
                "nombre": ap.nombre,
                "marca": ap.marca,
                "modelo": ap.modelo,
                "ssid": ap.ssid,
                "frecuencia": ap.frecuencia,
                "canal": ap.canal,
                "seguridad": ap.seguridad,
                "potencia_dbm": ap.potencia_dbm,
                "ip": ap.ip,
                "ip_admin": ap.ip_admin,
                "usuario_admin": ap.usuario_admin,
                "mac": ap.mac,
                "ubicacion": ap.ubicacion,
                "activo": ap.activo,
            }
            for ap in aps
        ],
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[dict])
def list_zonas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zonas = db.query(models.Zona).filter(models.Zona.activo == True).all()
    return [_zona_to_dict(z, db) for z in zonas]


@router.post("", response_model=schemas.ZonaOut, status_code=201)
def create_zona(
    data: schemas.ZonaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    if db.query(models.Zona).filter(models.Zona.nombre == data.nombre).first():
        raise HTTPException(status_code=400, detail="Zona ya existe")
    zona = models.Zona(**data.model_dump())
    db.add(zona)
    db.commit()
    db.refresh(zona)
    return zona


@router.get("/{zona_id}", response_model=dict)
def get_zona(
    zona_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    return _zona_to_dict(zona, db)


@router.put("/{zona_id}")
def update_zona(
    zona_id: int,
    data: schemas.ZonaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    for k, v in data.model_dump().items():
        setattr(zona, k, v)
    db.commit()
    db.refresh(zona)
    return {"ok": True}


@router.delete("/{zona_id}")
def delete_zona(
    zona_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    clientes = db.query(models.Cliente).filter(models.Cliente.zona_id == zona_id).count()
    if clientes > 0:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar: tiene {clientes} cliente(s) asignados")
    db.delete(zona)
    db.commit()
    return {"ok": True}


# ── WireGuard status (ping + SSH + WG handshake) ──────────────────────────────

@router.get("/{zona_id}/wireguard-status")
def wireguard_status(
    zona_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")

    ip = zona.ip_wireguard
    ping_ok = ping_host(ip)
    ssh_ok = check_ssh_port(ip) if ping_ok else False

    # Estado WireGuard real desde wg show
    wg_peer = wg_peer_status(zona.wg_public_key) if zona.wg_public_key else None

    last_handshake_ts = wg_peer["last_handshake"] if wg_peer else 0
    last_handshake_fmt = (
        datetime.utcfromtimestamp(last_handshake_ts).strftime("%d/%m/%Y %H:%M:%S UTC")
        if last_handshake_ts else "Sin handshake"
    )

    return {
        "zona": zona.nombre,
        "ip": ip,
        "online": ping_ok,
        "ssh_ok": ssh_ok,
        "wg_peer_online": wg_peer["online"] if wg_peer else False,
        "last_handshake": last_handshake_fmt,
        "last_handshake_ts": last_handshake_ts,
        "rx_bytes": wg_peer["rx_bytes"] if wg_peer else 0,
        "tx_bytes": wg_peer["tx_bytes"] if wg_peer else 0,
        "status": "conectado" if ping_ok else "desconectado",
        "vps_pubkey": settings.VPS_WG_PUBKEY,
        "vps_endpoint": f"{settings.VPS_IP}:51820",
    }


# ── WireGuard peer management ─────────────────────────────────────────────────

@router.post("/{zona_id}/wireguard/peer")
def add_wg_peer(
    zona_id: int,
    pubkey: str,
    lan_network: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """
    Agrega el peer WireGuard de la zona.
    allowed_ips = {ip_wireguard}/32[, {lan_network}]
    Retorna la pubkey del VPS para configurar en el MikroTik.
    """
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")

    allowed_ips = f"{zona.ip_wireguard}/32"
    if lan_network:
        allowed_ips += f", {lan_network}"
    elif zona.ip_lan:
        # Derivar red /24 desde ip_lan (ej: 192.168.80.1 → 192.168.80.0/24)
        parts = zona.ip_lan.split(".")
        if len(parts) == 4:
            allowed_ips += f", {parts[0]}.{parts[1]}.{parts[2]}.0/24"

    result = wg_add_peer(pubkey, allowed_ips, comment=zona.nombre)
    if not result["ok"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Error WireGuard"))

    # Guardar pubkey en la zona
    zona.wg_public_key = pubkey
    db.commit()

    return {
        "ok": True,
        "vps_pubkey": settings.VPS_WG_PUBKEY,
        "vps_endpoint": f"{settings.VPS_IP}:51820",
        "allowed_ips_configurados": allowed_ips,
        "peer_wg_ip": zona.ip_wireguard,
    }


@router.delete("/{zona_id}/wireguard/peer")
def remove_wg_peer(
    zona_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    if not zona.wg_public_key:
        raise HTTPException(status_code=400, detail="La zona no tiene clave pública WireGuard registrada")

    result = wg_remove_peer(zona.wg_public_key)
    if not result["ok"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Error WireGuard"))

    zona.wg_public_key = None
    db.commit()
    return {"ok": True}


@router.get("/{zona_id}/wireguard/peers-activos")
def wg_peers_activos(
    current_user: models.Usuario = Depends(get_current_user),
):
    """Lista todos los peers activos en wg0 con su estado."""
    return {"peers": wg_show_dump(), "vps_pubkey": settings.VPS_WG_PUBKEY}


# ── Access Points ─────────────────────────────────────────────────────────────

@router.get("/{zona_id}/ips-disponibles")
def ips_disponibles(
    zona_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    import ipaddress
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona or not zona.ip_lan:
        return {"ips": [], "subnet": None, "usadas_count": 0}

    parts = zona.ip_lan.split(".")
    if len(parts) != 4:
        return {"ips": [], "subnet": None, "usadas_count": 0}

    network_str = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
    network = ipaddress.IPv4Network(network_str, strict=False)

    usadas = {
        r[0] for r in db.query(models.Cliente.ip_estatica).filter(
            models.Cliente.zona_id == zona_id,
            models.Cliente.ip_estatica.isnot(None),
            models.Cliente.ip_estatica != "",
        ).all()
    }

    excluidas = {str(network.network_address), str(network.broadcast_address), zona.ip_lan}

    disponibles = [
        str(ip) for ip in network.hosts()
        if str(ip) not in usadas and str(ip) not in excluidas
    ]

    return {"ips": disponibles, "subnet": network_str, "usadas_count": len(usadas)}


@router.post("/{zona_id}/access-points", response_model=schemas.AccessPointOut, status_code=201)
def create_ap(
    zona_id: int,
    data: schemas.AccessPointCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    ap = models.AccessPoint(**data.model_dump())
    db.add(ap)
    db.commit()
    db.refresh(ap)
    return ap


@router.delete("/{zona_id}/access-points/{ap_id}")
def delete_ap(
    zona_id: int,
    ap_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    ap = db.query(models.AccessPoint).filter(
        models.AccessPoint.id == ap_id,
        models.AccessPoint.zona_id == zona_id,
    ).first()
    if not ap:
        raise HTTPException(status_code=404, detail="AP no encontrado")
    db.delete(ap)
    db.commit()
    return {"ok": True}


# ── Terminal SSH MikroTik ─────────────────────────────────────────────────────

class TerminalCmd(BaseModel):
    cmd: str


def _ssh_exec(host: str, cmd: str, timeout: int = 30) -> dict:
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
        _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors="ignore").strip()
        err = stderr.read().decode(errors="ignore").strip()
        ssh.close()
        output = out if out else (err if err else "(sin salida)")
        return {"ok": True, "output": output}
    except Exception as e:
        logger.warning("SSH terminal %s falló: %s", host, e)
        return {"ok": False, "output": f"Error de conexión: {e}"}


@router.post("/{zona_id}/exec")
def exec_terminal(
    zona_id: int,
    body: TerminalCmd,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    zona = db.query(models.Zona).filter(models.Zona.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    if not zona.ip_wireguard:
        raise HTTPException(status_code=400, detail="Zona sin WireGuard configurado")
    cmd = body.cmd.strip()
    if not cmd:
        raise HTTPException(status_code=400, detail="Comando vacío")
    return _ssh_exec(zona.ip_wireguard, cmd)
