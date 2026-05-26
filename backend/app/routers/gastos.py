from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional

from ..database import get_db
from .. import models, schemas
from .auth import get_current_user

router = APIRouter()


@router.get("", response_model=dict)
def list_gastos(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    mes: Optional[str] = None,
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    query = db.query(models.Gasto)

    if mes:
        anio, m = mes.split("-")
        query = query.filter(
            extract("year", models.Gasto.fecha) == int(anio),
            extract("month", models.Gasto.fecha) == int(m),
        )
    if categoria:
        query = query.filter(models.Gasto.categoria == categoria)

    query = query.order_by(models.Gasto.fecha.desc())
    total = query.count()
    gastos = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "items": [schemas.GastoOut.model_validate(g) for g in gastos],
    }


@router.post("", response_model=schemas.GastoOut, status_code=201)
def create_gasto(
    data: schemas.GastoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    gasto = models.Gasto(**data.model_dump(), registrado_por=current_user.id)
    db.add(gasto)
    db.commit()
    db.refresh(gasto)
    return gasto


@router.put("/{gasto_id}", response_model=schemas.GastoOut)
def update_gasto(
    gasto_id: int,
    data: schemas.GastoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    gasto = db.query(models.Gasto).filter(models.Gasto.id == gasto_id).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    for k, v in data.model_dump().items():
        setattr(gasto, k, v)
    db.commit()
    db.refresh(gasto)
    return gasto


@router.delete("/{gasto_id}")
def delete_gasto(
    gasto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    gasto = db.query(models.Gasto).filter(models.Gasto.id == gasto_id).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(gasto)
    db.commit()
    return {"ok": True}


@router.get("/categorias")
def get_categorias(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    categorias = db.query(models.Gasto.categoria).distinct().filter(
        models.Gasto.categoria.isnot(None)
    ).all()
    return [c[0] for c in categorias]
