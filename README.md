# TUX-ISP — Sistema de Gestión para tuxtell.net

Sistema completo de gestión de clientes para ISP con backend FastAPI + PostgreSQL y frontend React + Tailwind.

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| WhatsApp | whatsapp-web.js (Node.js) |
| Infra | Docker Compose, Nginx |

## Inicio rápido

```bash
# 1. Clonar/copiar el proyecto al VPS
# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar con Docker
docker compose up -d

# 4. Acceder
# Frontend: http://161.132.48.127
# API Docs: http://161.132.48.127/api/docs
```

## Credenciales por defecto

- **Email:** admin@tuxtell.net
- **Password:** admin2024

## Zonas

| Zona | WireGuard IP |
|------|-------------|
| Cabanillas | 10.10.0.2 |
| Palca | 10.10.0.3 |
| Paratia | 10.10.0.4 |

## Planes

| Código | Bajada | Subida | Precio |
|--------|--------|--------|--------|
| PLAN01 | 15 Mbps | 6 Mbps | S/ 50 |
| PLAN02 | 20 Mbps | 8 Mbps | S/ 60 |
| PLAN03 | 30 Mbps | 15 Mbps | S/ 70 |
| PLAN04 | 100 Mbps | 10 Mbps | S/ 100 |

## WhatsApp

El servicio WhatsApp se conecta automáticamente al iniciar. Escanear el QR desde el panel `/whatsapp`.

Yape para cobros: **936511008**

## Estructura del Proyecto

```
tuxtell-isp/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS
│   │   ├── models.py        # Modelos SQLAlchemy
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── database.py      # Conexión PostgreSQL
│   │   ├── config.py        # Configuración
│   │   ├── seed.py          # Datos iniciales
│   │   └── routers/
│   │       ├── auth.py      # JWT auth
│   │       ├── clientes.py  # CRUD clientes + PPPoE
│   │       ├── zonas.py     # Zonas + WireGuard status
│   │       ├── pagos.py     # Pagos + calendario
│   │       ├── gastos.py    # Gastos
│   │       ├── dashboard.py # Stats + gráficas
│   │       └── whatsapp.py  # Mensajería
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.jsx     # Gráficas + stats
│       │   ├── Clientes.jsx      # Tabla paginada
│       │   ├── ClienteDetalle.jsx # Edición + calendario pagos
│       │   ├── NuevoCliente.jsx  # Formulario registro
│       │   ├── Zonas.jsx         # Cards por zona
│       │   ├── Pagos.jsx         # Registro + sin pago
│       │   ├── WhatsApp.jsx      # QR + mensajería
│       │   └── Configuracion.jsx # Ajustes sistema
│       └── api/client.js    # Axios con JWT
├── whatsapp/
│   └── server.js            # API WhatsApp Web
├── nginx/nginx.conf          # Reverse proxy
└── docker-compose.yml
```
