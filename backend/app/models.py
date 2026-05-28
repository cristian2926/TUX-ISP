from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class EstadoCliente(str, enum.Enum):
    activo = "activo"
    anulado = "anulado"
    suspendido = "suspendido"


class EstadoPago(str, enum.Enum):
    pagado = "pagado"
    pendiente = "pendiente"
    vencido = "vencido"
    corte_temporal = "corte_temporal"


class TipoHistorial(str, enum.Enum):
    activacion = "activacion"
    corte = "corte"
    pago = "pago"
    cambio_plan = "cambio_plan"
    nota = "nota"


class TipoConexion(str, enum.Enum):
    inalambrico = "inalambrico"
    fibra_optica = "fibra_optica"


class EstadoEquipo(str, enum.Enum):
    prestado = "prestado"
    comprado = "comprado"
    sin_equipo = "sin_equipo"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(String(50), default="admin")
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class Zona(Base):
    __tablename__ = "zonas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    ip_lan = Column(String(20))
    usuario_mikrotik = Column(String(100))
    password_mikrotik = Column(String(255))
    router_mikrotik = Column(String(100))
    ip_wireguard = Column(String(20), nullable=False)
    wg_public_key = Column(String(255))
    ip_router = Column(String(20))
    descripcion = Column(Text)
    tiendas_pago = Column(Text)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    clientes = relationship("Cliente", back_populates="zona")
    access_points = relationship("AccessPoint", back_populates="zona")


class Plan(Base):
    __tablename__ = "planes"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    bajada_mbps = Column(Integer, nullable=False)
    subida_mbps = Column(Integer, nullable=False)
    precio = Column(Float, nullable=False)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)

    clientes = relationship("Cliente", back_populates="plan")


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    telefono = Column(String(20))
    telefono_whatsapp = Column(String(20))
    direccion = Column(Text)
    usuario_pppoe = Column(String(100), unique=True, nullable=False)
    password_pppoe = Column(String(100), nullable=False)
    ip_estatica = Column(String(20))
    zona_id = Column(Integer, ForeignKey("zonas.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("planes.id"), nullable=False)
    fecha_instalacion = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date)
    estado = Column(SAEnum(EstadoCliente), default=EstadoCliente.activo, nullable=False)

    # Tipo de servicio
    tipo_conexion = Column(SAEnum(TipoConexion), default=TipoConexion.inalambrico)
    tiene_tv = Column(Boolean, default=False)

    # Equipo entregado
    estado_equipo = Column(SAEnum(EstadoEquipo), default=EstadoEquipo.sin_equipo)
    equipo_marca = Column(String(100))
    equipo_modelo = Column(String(100))
    equipo_serial = Column(String(100))
    equipo_descripcion = Column(Text)
    equipo_fecha_entrega = Column(Date)
    equipo_valor = Column(Float)

    notas = Column(Text)
    fecha_ultima_activacion = Column(Date)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    zona = relationship("Zona", back_populates="clientes")
    plan = relationship("Plan", back_populates="clientes")
    pagos = relationship("Pago", back_populates="cliente", order_by="Pago.fecha_pago.desc()")
    historial = relationship("Historial", back_populates="cliente", order_by="Historial.creado_en.desc()")


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    monto = Column(Float, nullable=False)
    mes_pagado = Column(String(7), nullable=False)
    fecha_pago = Column(Date, nullable=False)
    metodo_pago = Column(String(50), default="efectivo")
    referencia = Column(String(100))
    estado = Column(SAEnum(EstadoPago), default=EstadoPago.pagado)
    notas = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    registrado_por = Column(Integer, ForeignKey("usuarios.id"))

    cliente = relationship("Cliente", back_populates="pagos")


class Gasto(Base):
    __tablename__ = "gastos"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(255), nullable=False)
    monto = Column(Float, nullable=False)
    categoria = Column(String(100), nullable=False, default="Otros")
    fecha = Column(Date, nullable=False)
    proveedor = Column(String(150))
    numero_factura = Column(String(100))
    comprobante = Column(String(255))
    es_recurrente = Column(Boolean, default=False)
    notas = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    registrado_por = Column(Integer, ForeignKey("usuarios.id"))


class AccessPoint(Base):
    __tablename__ = "access_points"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    marca = Column(String(50))           # Ubiquiti, TP-Link, Mikrotik, etc.
    modelo = Column(String(100))
    # Red
    ssid = Column(String(100))
    frecuencia = Column(String(20))      # 2.4GHz, 5GHz, 5.8GHz
    canal = Column(String(10))
    seguridad = Column(String(20), default="WPA2")
    potencia_dbm = Column(Integer)
    # Acceso
    ip = Column(String(20))              # IP del cliente en la red
    ip_admin = Column(String(20))        # IP para administrar el AP
    usuario_admin = Column(String(100))
    password_admin = Column(String(255))
    mac = Column(String(20))
    zona_id = Column(Integer, ForeignKey("zonas.id"), nullable=False)
    ubicacion = Column(String(255))
    activo = Column(Boolean, default=True)
    ultimo_ping = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    zona = relationship("Zona", back_populates="access_points")



class Historial(Base):
    __tablename__ = "historial"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo = Column(SAEnum(TipoHistorial), nullable=False)
    descripcion = Column(Text, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    cliente = relationship("Cliente", back_populates="historial")
