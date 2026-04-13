from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Product
from app.schemas.schemas import ProductCreate, ProductResponse, ProductListResponse

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=List[ProductListResponse])
def get_products(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    is_new: Optional[bool] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
):
    query = db.query(Product)
    
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if featured is not None:
        query = query.filter(Product.is_featured == featured)
    if is_new is not None:
        query = query.filter(Product.is_new == is_new)
    
    return query.offset(offset).limit(limit).all()


@router.get("/search")
def search_products(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.name.ilike(f"%{q}%")).limit(10).all()
    suggestions = [p.name for p in products]
    return {"query": q, "products": suggestions}


@router.get("/featured", response_model=List[ProductListResponse])
def get_featured_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_featured == True).limit(10).all()


@router.get("/new", response_model=List[ProductListResponse])
def get_new_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_new == True).limit(10).all()


@router.get("/recommendations", response_model=List[ProductListResponse])
def get_recommendations(
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            return db.query(Product).filter(
                Product.category == product.category,
                Product.id != product_id
            ).limit(6).all()
    
    return db.query(Product).filter(
        Product.is_featured == True
    ).limit(10).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product