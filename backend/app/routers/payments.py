from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import razorpay
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Order
from app.core.config import settings

router = APIRouter(prefix="/api/payments", tags=["Payments"])


class CreatePaymentRequest(BaseModel):
    order_id: int
    payment_method: str


class PaymentResponse(BaseModel):
    order_id: int
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    status: str


@router.post("/create-order")
def create_payment_order(
    request: CreatePaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == request.order_id,
        Order.user_id == current_user.id,
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.payment_status == "completed":
        raise HTTPException(status_code=400, detail="Payment already completed")
    
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    
    amount_paise = int(float(order.total_amount) * 100)
    
    razorpay_order = client.order.create({
        'amount': amount_paise,
        'currency': 'INR',
        'receipt': order.order_number,
        'notes': {
            'order_id': str(order.id),
            'user_id': str(current_user.id),
        }
    })
    
    return {
        "order_id": order.id,
        "razorpay_order_id": razorpay_order.get("id"),
        "amount": float(order.total_amount),
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
    }


@router.post("/verify")
def verify_payment(
    razorpay_payment_id: str,
    razorpay_order_id: str,
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
    
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    
    try:
        payment = client.payment.fetch(razorpay_payment_id)
        
        if payment.get("status") == "captured":
            order.payment_status = "completed"
            if order.status == "pending":
                order.status = "processing"
            db.commit()
            db.refresh(order)
            return {"success": True, "order": order}
        else:
            order.payment_status = "failed"
            db.commit()
            return {"success": False, "message": "Payment not captured"}
    except Exception as e:
        order.payment_status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")


@router.get("/methods")
def get_payment_methods():
    return {
        "methods": [
            {"id": "cod", "name": "Cash on Delivery", "description": "Pay when you receive"},
            {"id": "upi", "name": "UPI", "description": "Pay using UPI app"},
            {"id": "card", "name": "Card", "description": "Credit/Debit Card via Razorpay"},
        ]
    }
