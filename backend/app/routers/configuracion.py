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
    dias_aviso_1: Optional[int] = None
    dias_aviso_2: Optional[int] = None
    dias_aviso_3: Optional[int] = None
    dias_gracia: Optional[int] = 3


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
        "dias_aviso_1": config.dias_aviso_1,
        "dias_aviso_2": config.dias_aviso_2,
        "dias_aviso_3": config.dias_aviso_3,
        "dias_gracia": config.dias_gracia,
    }


@router.put("")
def update_configuracion(
    data: ConfiguracionUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    config = _get_or_create(db)
    config.automation_activa = data.automation_activa
    config.dias_aviso_1 = data.dias_aviso_1
    config.dias_aviso_2 = data.dias_aviso_2
    config.dias_aviso_3 = data.dias_aviso_3
    config.dias_gracia = data.dias_gracia
    db.commit()
    return {"ok": True}
