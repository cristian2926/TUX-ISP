from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from .. import models
from .auth import get_current_user

router = APIRouter()


class ConfiguracionUpdate(BaseModel):
    automation_activa: bool = False
    dia_recordatorio_1: Optional[int] = None
    dia_recordatorio_2: Optional[int] = None
    dia_recordatorio_3: Optional[int] = None
    dia_corte_automatico: Optional[int] = None


def _get_or_create(db: Session) -> models.ConfiguracionSistema:
    config = db.query(models.ConfiguracionSistema).filter(
        models.ConfiguracionSistema.id == 1
    ).first()
    if not config:
        config = models.ConfiguracionSistema(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("")
def get_configuracion(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    config = _get_or_create(db)
    return {
        "automation_activa": config.automation_activa,
        "dia_recordatorio_1": config.dia_recordatorio_1,
        "dia_recordatorio_2": config.dia_recordatorio_2,
        "dia_recordatorio_3": config.dia_recordatorio_3,
        "dia_corte_automatico": config.dia_corte_automatico,
    }


@router.put("")
def update_configuracion(
    data: ConfiguracionUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    config = _get_or_create(db)
    config.automation_activa = data.automation_activa
    config.dia_recordatorio_1 = data.dia_recordatorio_1
    config.dia_recordatorio_2 = data.dia_recordatorio_2
    config.dia_recordatorio_3 = data.dia_recordatorio_3
    config.dia_corte_automatico = data.dia_corte_automatico
    db.commit()
    return {"ok": True}
