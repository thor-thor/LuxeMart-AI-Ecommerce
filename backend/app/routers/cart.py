from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Product, CartItem
from app.schemas.schemas import CartItemCreate, CartItemResponse

router = APIRouter(prefix="/api/cart", tags=["Cart"])


@router.get("", response_model=List[CartItemResponse])
def get_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(CartItem).filter(CartItem.user_id == current_user.id).all()


@router.post("", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    item: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == item.product_id,
    ).first()
    
    if existing:
        existing.quantity += item.quantity
        db.commit()
        db.refresh(existing)
        return existing
    
    new_item = CartItem(
        user_id=current_user.id,
        product_id=item.product_id,
        quantity=item.quantity,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.put("/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    quantity: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if quantity <= 0:
        db.delete(item)
        db.commit()
        return None
    
    item.quantity = quantity
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_cart(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()