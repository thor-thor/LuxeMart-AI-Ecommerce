from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Product, WishlistItem
from app.schemas.schemas import WishlistItemResponse, ProductBase

router = APIRouter(prefix="/api/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItemResponse])
def get_wishlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()


@router.post("", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id,
    ).first()
    
    if existing:
        return existing
    
    new_item = WishlistItem(
        user_id=current_user.id,
        product_id=product_id,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishlistItem).filter(
        WishlistItem.id == item_id,
        WishlistItem.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    db.delete(item)
    db.commit()