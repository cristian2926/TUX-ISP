import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime
from .models import EstadoCliente, EstadoPago, TipoHistorial, TipoConexion, EstadoEquipo

_PPPOE_RE = re.compile(r'^[a-zA-Z0-9._@-]{1,100}$')
_IPV4_RE = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr
    rol: str = "admin"

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioOut(UsuarioBase):
    id: int
    activo: bool
    creado_en: datetime
    class Config:
        from_attributes = True

class ChangePassword(BaseModel):
    password_actual: str
    password_nueva: str


# ── Plan ──────────────────────────────────────────────────────────────────────

class PlanBase(BaseModel):
    codigo: str
    nombre: str
    bajada_mbps: int
    subida_mbps: int
    precio: float
    descripcion: Optional[str] = None

class PlanCreate(PlanBase):
    pass

class PlanOut(PlanBase):
    id: int
    activo: bool
    class Config:
        from_attributes = True


# ── Zona ──────────────────────────────────────────────────────────────────────

class ZonaBase(BaseModel):
    nombre: str
    ip_wireguard: str
    ip_lan: Optional[str] = None
    usuario_mikrotik: Optional[str] = None
    password_mikrotik: Optional[str] = None
    wg_public_key: Optional[str] = None
    router_mikrotik: Optional[str] = None
    ip_router: Optional[str] = None
    descripcion: Optional[str] = None
    tiendas_pago: Optional[str] = None

class ZonaCreate(ZonaBase):
    pass

class ZonaOut(ZonaBase):
    id: int
    activo: bool
    creado_en: datetime
    total_clientes: Optional[int] = 0
    clientes_activos: Optional[int] = 0
    class Config:
        from_attributes = True



# ── Cliente ───────────────────────────────────────────────────────────────────

class ClienteBase(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    telefono_whatsapp: Optional[str] = None
    direccion: Optional[str] = None
    usuario_pppoe: str
    password_pppoe: str
    ip_estatica: Optional[str] = None
    pin_app: Optional[str] = None

    @field_validator('usuario_pppoe')
    @classmethod
    def validate_usuario_pppoe(cls, v: str) -> str:
        if not _PPPOE_RE.match(v):
            raise ValueError('Solo se permiten letras, números, punto, guión, arroba y guión bajo (máx 100 caracteres)')
        return v

    @field_validator('ip_estatica')
    @classmethod
    def validate_ip_estatica(cls, v: Optional[str]) -> Optional[str]:
        if v and not _IPV4_RE.match(v):
            raise ValueError('Debe ser una dirección IPv4 válida')
        return v
    zona_id: int
    plan_id: int
    fecha_instalacion: date
    fecha_vencimiento: Optional[date] = None
    estado: EstadoCliente = EstadoCliente.activo
    tipo_conexion: TipoConexion = TipoConexion.inalambrico
    tiene_tv: bool = False
    estado_equipo: EstadoEquipo = EstadoEquipo.sin_equipo
    equipo_marca: Optional[str] = None
    equipo_modelo: Optional[str] = None
    equipo_serial: Optional[str] = None
    equipo_descripcion: Optional[str] = None
    equipo_fecha_entrega: Optional[date] = None
    equipo_valor: Optional[float] = None
    notas: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    telefono_whatsapp: Optional[str] = None
    direccion: Optional[str] = None
    password_pppoe: Optional[str] = None
    ip_estatica: Optional[str] = None
    pin_app: Optional[str] = None
    zona_id: Optional[int] = None
    plan_id: Optional[int] = None
    fecha_instalacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    estado: Optional[EstadoCliente] = None
    tipo_conexion: Optional[TipoConexion] = None
    tiene_tv: Optional[bool] = None
    estado_equipo: Optional[EstadoEquipo] = None
    equipo_marca: Optional[str] = None
    equipo_modelo: Optional[str] = None
    equipo_serial: Optional[str] = None
    equipo_descripcion: Optional[str] = None
    equipo_fecha_entrega: Optional[date] = None
    equipo_valor: Optional[float] = None
    notas: Optional[str] = None

class ClienteOut(ClienteBase):
    id: int
    creado_en: datetime
    zona: Optional[ZonaOut] = None
    plan: Optional[PlanOut] = None
    class Config:
        from_attributes = True

class ClienteListItem(BaseModel):
    id: int
    nombre: str
    telefono: Optional[str] = None
    usuario_pppoe: str
    ip_estatica: Optional[str] = None
    estado: EstadoCliente
    tipo_conexion: Optional[TipoConexion] = None
    tiene_tv: Optional[bool] = False
    zona: Optional[ZonaOut] = None
    plan: Optional[PlanOut] = None
    fecha_instalacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    class Config:
        from_attributes = True


# ── Pago ──────────────────────────────────────────────────────────────────────

class PagoBase(BaseModel):
    cliente_id: int
    monto: float
    mes_pagado: str
    fecha_pago: date
    metodo_pago: str = "efectivo"
    referencia: Optional[str] = None
    estado: EstadoPago = EstadoPago.pagado
    notas: Optional[str] = None

class PagoCreate(PagoBase):
    pass

class ClienteNombre(BaseModel):
    id: int
    nombre: str
    class Config:
        from_attributes = True

class PagoOut(PagoBase):
    id: int
    creado_en: datetime
    cliente: Optional[ClienteNombre] = None
    class Config:
        from_attributes = True


# ── Gasto ─────────────────────────────────────────────────────────────────────

class GastoBase(BaseModel):
    descripcion: str
    monto: float
    categoria: str = "Otros"
    fecha: date
    proveedor: Optional[str] = None
    numero_factura: Optional[str] = None
    comprobante: Optional[str] = None
    es_recurrente: bool = False
    notas: Optional[str] = None

class GastoCreate(GastoBase):
    pass

class GastoOut(GastoBase):
    id: int
    creado_en: datetime
    class Config:
        from_attributes = True


# ── Historial ─────────────────────────────────────────────────────────────────

class HistorialOut(BaseModel):
    id: int
    cliente_id: int
    tipo: TipoHistorial
    descripcion: str
    creado_en: datetime
    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_clientes: int
    clientes_activos: int
    clientes_suspendidos: int
    ingresos_mes_actual: float
    ingresos_mes_anterior: float
    gastos_mes_actual: float
    total_zonas: int
    pagos_pendientes: int

class IngresoMensual(BaseModel):
    mes: str
    ingresos: float
    gastos: float


# ── Auth cliente (app móvil) ──────────────────────────────────────────────────

class ClienteLoginRequest(BaseModel):
    telefono: str
    pin: str

class ClienteTokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    cliente_id: int
    nombre: str

class MiCuentaOut(BaseModel):
    id: int
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    estado: EstadoCliente
    plan: Optional[PlanOut] = None
    fecha_vencimiento: Optional[date] = None
    fecha_instalacion: Optional[date] = None
    class Config:
        from_attributes = True
