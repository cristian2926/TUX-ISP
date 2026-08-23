from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, or_, and_
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
    if mes:
        anio_int, m_int = map(int, mes.split("-"))

        en_mes = and_(
            extract("year", models.Gasto.fecha) == anio_int,
            extract("month", models.Gasto.fecha) == m_int,
        )

        # Gastos de meses anteriores al que se consulta
        antes_del_mes = or_(
            extract("year", models.Gasto.fecha) < anio_int,
            and_(
                extract("year", models.Gasto.fecha) == anio_int,
                extract("month", models.Gasto.fecha) < m_int,
            ),
        )

        # El gasto recurrente más reciente por (descripcion, categoria) de meses anteriores
        latest_recur_sq = db.query(
            func.max(models.Gasto.id).label("max_id")
        ).filter(
            models.Gasto.es_recurrente == True,
            antes_del_mes,
        ).group_by(
            models.Gasto.descripcion,
            models.Gasto.categoria,
        ).subquery()

        # Excluir recurrentes cuya descripcion ya fue registrada este mes (evitar duplicados)
        descs_en_mes_sq = db.query(models.Gasto.descripcion).filter(en_mes)

        recurrentes_ids_sq = db.query(models.Gasto.id).join(
            latest_recur_sq, models.Gasto.id == latest_recur_sq.c.max_id
        ).filter(
            ~models.Gasto.descripcion.in_(descs_en_mes_sq)
        ).subquery()

        query = db.query(models.Gasto).filter(
            or_(
                en_mes,
                models.Gasto.id.in_(recurrentes_ids_sq),
            )
        )
    else:
        query = db.query(models.Gasto)

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
