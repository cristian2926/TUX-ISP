from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from .auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[schemas.PlanOut])
def list_planes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Plan).order_by(models.Plan.precio).all()
