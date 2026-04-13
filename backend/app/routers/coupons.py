from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Coupon
from app.schemas.schemas import CouponApplyRequest, CouponResponse

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


@router.post("/apply", response_model=CouponResponse)
def apply_coupon(
    coupon_data: CouponApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coupon = db.query(Coupon).filter(Coupon.code == coupon_data.code.upper()).first()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is no longer active")
    
    now = datetime.utcnow()
    if now < coupon.valid_from or now > coupon.valid_until:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    
    if coupon.max_uses and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    return coupon


@router.get("/validate/{code}", response_model=CouponResponse)
def validate_coupon(
    code: str,
    order_amount: float = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coupon = db.query(Coupon).filter(Coupon.code == code.upper()).first()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is no longer active")
    
    now = datetime.utcnow()
    if now < coupon.valid_from or now > coupon.valid_until:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    
    if coupon.max_uses and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    if order_amount > 0 and float(coupon.min_order_amount) > order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order amount of Rs. {coupon.min_order_amount} required"
        )
    
    return coupon


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_coupon(
    code: str,
    discount_type: str = "percentage",
    discount_value: float = 10,
    min_order_amount: float = 0,
    max_uses: int = 100,
    valid_days: int = 30,
    db: Session = Depends(get_db),
):
    from datetime import timedelta
    from decimal import Decimal
    
    existing = db.query(Coupon).filter(Coupon.code == code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon = Coupon(
        code=code.upper(),
        discount_type=discount_type,
        discount_value=Decimal(str(discount_value)),
        min_order_amount=Decimal(str(min_order_amount)),
        max_uses=max_uses,
        valid_from=datetime.utcnow(),
        valid_until=datetime.utcnow() + timedelta(days=valid_days),
        is_active=True,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon
