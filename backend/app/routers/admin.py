from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from fastapi import BackgroundTasks
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Product, Order, OrderItem
from app.schemas.schemas import ProductCreate, ProductResponse, OrderResponse, OrderStatusUpdate, AnalyticsResponse, ProductListResponse
from app.core.email_service import send_order_status_update

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.status == "pending").count()
    completed_orders = db.query(Order).filter(Order.status == "delivered").count()
    total_products = db.query(Product).count()
    total_users = db.query(User).count()
    
    top_products = db.query(Product).order_by(Product.rating.desc()).limit(5).all()
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(5).all()
    
    return {
        "total_revenue": float(total_revenue),
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_products": total_products,
        "total_users": total_users,
        "top_products": top_products,
        "recent_orders": recent_orders,
    }


@router.get("/orders", response_model=List[OrderResponse])
def get_all_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    status_filter: str = None,
):
    query = db.query(Order).order_by(Order.created_at.desc())
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return query.all()


@router.put("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_status = order.status
    order.status = status_data.status
    
    if status_data.payment_status:
        order.payment_status = status_data.payment_status
    
    db.commit()
    db.refresh(order)
    
    if old_status != status_data.status:
        background_tasks.add_task(send_order_status_update,
            customer_email=order.user.email,
            customer_name=order.user.full_name or order.user.username,
            order_number=order.order_number,
            status=status_data.status,
            order_id=order.id,
        )
    
    return order


@router.get("/products", response_model=List[ProductResponse])
def get_all_products(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(Product).all()


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = Product(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product_data.model_dump().items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()

@router.post("/coupons", status_code=status.HTTP_201_CREATED)
def create_coupon(
    coupon_data: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.models import Coupon
    from datetime import datetime, timedelta
    from decimal import Decimal
    
    coupon = Coupon(
        code=coupon_data.get("code", "").upper(),
        discount_type=coupon_data.get("discount_type", "percentage"),
        discount_value=Decimal(str(coupon_data.get("discount_value", 0))),
        min_order_amount=Decimal(str(coupon_data.get("min_order_amount", 0))),
        max_uses=coupon_data.get("max_uses"),
        valid_from=datetime.utcnow(),
        valid_until=datetime.utcnow() + timedelta(days=coupon_data.get("valid_days", 30)),
        is_active=True,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon
