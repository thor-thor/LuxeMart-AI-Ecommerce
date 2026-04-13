from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Product, CartItem, Order, OrderItem
from app.schemas.schemas import OrderCreate, OrderResponse
from app.core.email_service import send_order_confirmation, send_new_order_notification, send_order_status_update

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.get("", response_model=List[OrderResponse])
def get_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    payment_method = order_data.payment_method
    if payment_method == "cod":
        payment_status = "pending"
        order_status = "pending"
    elif payment_method == "upi":
        payment_status = "pending"
        order_status = "pending"
    elif payment_method == "card":
        payment_status = "completed"
        order_status = "processing"
    else:
        payment_status = "pending"
        order_status = "pending"
    
    total_amount = 0
    order_number = f"LX-{uuid.uuid4().hex[:8].upper()}"
    
    order = Order(
        user_id=current_user.id,
        order_number=order_number,
        total_amount=0,
        status=order_status,
        payment_method=payment_method,
        payment_status=payment_status,
        shipping_address=order_data.shipping_address,
    )
    db.add(order)
    db.flush()
    
    items_data = []
    for item in cart_items:
        product = item.product
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}",
            )
        
        item_total = float(product.price) * item.quantity
        total_amount += item_total
        
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.price,
        )
        db.add(order_item)
        
        items_data.append({
            "name": product.name,
            "quantity": item.quantity,
            "price": float(product.price),
        })
        
        product.stock -= item.quantity
    
    order.total_amount = total_amount
    
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    
    db.commit()
    db.refresh(order)
    
    order_date = order.created_at.strftime("%Y-%m-%d %H:%M")
    
    background_tasks.add_task(send_order_confirmation,
        customer_email=current_user.email,
        customer_name=current_user.full_name or current_user.username,
        order_number=order.order_number,
        order_date=order_date,
        payment_method=payment_method.upper(),
        payment_status=payment_status.title(),
        items=items_data,
        total_amount=total_amount,
        shipping_address=order_data.shipping_address,
    )
    
    background_tasks.add_task(send_new_order_notification,
        admin_email="admin@luxemart.com",
        order_number=order.order_number,
        customer_name=current_user.full_name or current_user.username,
        customer_email=current_user.email,
        total_amount=total_amount,
        payment_method=payment_method.upper(),
        payment_status=payment_status.title(),
        items_text=", ".join([f"{item['name']} x{item['quantity']}" for item in items_data]),
        shipping_address=order_data.shipping_address,
    )
    
    return order


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    cancellable_statuses = ["pending", "confirmed", "processing"]
    if order.status not in cancellable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order with status: {order.status}. Orders can only be cancelled before shipment."
        )
    
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Order is already cancelled")
    
    order.status = "cancelled"
    
    for item in order.items:
        if item.product:
            item.product.stock += item.quantity
    
    db.commit()
    db.refresh(order)
    
    background_tasks.add_task(send_order_status_update,
        customer_email=str(current_user.email),
        customer_name=str(current_user.full_name or current_user.username),
        order_number=str(order.order_number),
        status="cancelled",
        order_id=order.id,
    )
    
    return order


@router.post("/buy-now", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def buy_now(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not order_data.buy_now_product_id or not order_data.buy_now_quantity:
        raise HTTPException(status_code=400, detail="Product and quantity required for Buy Now")
    
    product = db.query(Product).filter(Product.id == order_data.buy_now_product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.stock < order_data.buy_now_quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {product.stock}")
    
    payment_method = order_data.payment_method
    if payment_method == "cod":
        payment_status = "pending"
        order_status = "pending"
    elif payment_method == "upi":
        payment_status = "pending"
        order_status = "pending"
    elif payment_method == "card":
        payment_status = "completed"
        order_status = "processing"
    else:
        payment_status = "pending"
        order_status = "pending"
    
    total_amount = float(product.price) * order_data.buy_now_quantity
    order_number = f"LX-{uuid.uuid4().hex[:8].upper()}"
    
    order = Order(
        user_id=current_user.id,
        order_number=order_number,
        total_amount=total_amount,
        status=order_status,
        payment_method=payment_method,
        payment_status=payment_status,
        shipping_address=order_data.shipping_address,
    )
    db.add(order)
    db.flush()
    
    order_item = OrderItem(
        order_id=order.id,
        product_id=order_data.buy_now_product_id,
        quantity=order_data.buy_now_quantity,
        price=product.price,
    )
    db.add(order_item)
    
    product.stock -= order_data.buy_now_quantity
    
    db.commit()
    db.refresh(order)
    
    item_data = {
        "name": product.name,
        "quantity": order_data.buy_now_quantity,
        "price": float(product.price),
    }
    
    order_date = order.created_at.strftime("%Y-%m-%d %H:%M")
    
    background_tasks.add_task(send_order_confirmation,
        customer_email=str(current_user.email),
        customer_name=str(current_user.full_name or current_user.username),
        order_number=str(order.order_number),
        order_date=order_date,
        payment_method=payment_method.upper(),
        payment_status=payment_status.title(),
        items=[item_data],
        total_amount=total_amount,
        shipping_address=order_data.shipping_address,
    )
    
    background_tasks.add_task(send_new_order_notification,
        admin_email="admin@luxemart.com",
        order_number=str(order.order_number),
        customer_name=str(current_user.full_name or current_user.username),
        customer_email=str(current_user.email),
        total_amount=total_amount,
        payment_method=payment_method.upper(),
        payment_status=payment_status.title(),
        items_text=f"{product.name} x{order_data.buy_now_quantity}",
        shipping_address=order_data.shipping_address,
    )
    
    return order