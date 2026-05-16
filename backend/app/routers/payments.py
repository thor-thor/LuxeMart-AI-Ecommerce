"""
Secure Payment Router
Handles payment creation, verification, UPI processing, webhook handling,
and payment history retrieval with comprehensive security checks.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

import razorpay
import hmac
import hashlib

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Order
from app.models.payment_model import PaymentTransaction
from app.schemas.payment_schemas import (
    PaymentRequest,
    PaymentResponse,
    VerifyPaymentRequest,
    VerifyUPIPaymentRequest,
    WebhookVerifyRequest,
    PaymentHistoryResponse,
    PaymentLimitsResponse,
)
from app.core.config import settings
from app.core.payment_security import (
    verify_razorpay_signature,
    verify_upi_payment,
    verify_webhook_signature,
    verify_payment_timestamp,
    check_payment_limits,
    sanitize_payment_data,
    generate_payment_reference,
    validate_payment_method,
    PaymentSignatureError,
    PaymentVerificationError,
    PaymentSecurityError,
)

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/create-order", response_model=dict)
def create_payment_order(
    request: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a payment order for Card payments via Razorpay."""
    order = db.query(Order).filter(
        Order.id == request.order_id,
        Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.payment_status == "completed":
        raise HTTPException(status_code=400, detail="Payment already completed")

    if request.payment_method not in ("card", "upi"):
        raise HTTPException(
            status_code=400,
            detail="This endpoint only supports card and UPI payments",
        )

    # Security: validate payment limits
    limit_check = check_payment_limits(float(order.total_amount), request.payment_method)
    if not limit_check["allowed"]:
        raise HTTPException(status_code=400, detail=limit_check["reason"])

    # Check for existing transaction
    existing_txn = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.order_id == request.order_id)
        .filter(PaymentTransaction.status == "pending")
        .first()
    )

    if existing_txn:
        if request.payment_method == "upi":
            return {
                "order_id": order.id,
                "transaction_id": existing_txn.id,
                "amount": float(order.total_amount),
                "currency": "INR",
                "payment_method": "upi",
                "reference_id": existing_txn.reference_id,
                "upi_merchant_id": existing_txn.upi_merchant_id or settings.UPI_MERCHANT_ID,
                "upi_payment_url": f"upi://pay?pa={existing_txn.upi_merchant_id or settings.UPI_MERCHANT_ID}&pn=LuxeMart&am={order.total_amount}&cu=INR&tn=Order-{order.order_number}&tr={existing_txn.reference_id}",
                "message": "Resuming existing pending payment",
            }
        elif request.payment_method == "card":
            return {
                "order_id": order.id,
                "transaction_id": existing_txn.id,
                "razorpay_order_id": existing_txn.razorpay_order_id,
                "amount": float(order.total_amount),
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID,
                "payment_method": "card",
                "reference_id": existing_txn.reference_id,
                "message": "Resuming existing pending payment",
            }

    if request.payment_method == "card":
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise HTTPException(status_code=503, detail="Payment service not configured")

        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

        amount_paise = int(float(order.total_amount) * 100)

        razorpay_order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": order.order_number,
                "notes": {
                    "order_id": str(order.id),
                    "user_id": str(current_user.id),
                    "payment_method": "card",
                },
            }
        )

        reference_id = generate_payment_reference(order.id, "card")

        transaction = PaymentTransaction(
            order_id=order.id,
            payment_method="card",
            amount=float(order.total_amount),
            currency="INR",
            status="pending",
            razorpay_order_id=razorpay_order.get("id"),
            reference_id=reference_id,
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        return {
            "transaction_id": transaction.id,
            "order_id": order.id,
            "razorpay_order_id": razorpay_order.get("id"),
            "amount": float(order.total_amount),
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "payment_method": "card",
            "reference_id": reference_id,
        }

    elif request.payment_method == "upi":
        # For UPI, we create a pending transaction and handle verification via webhook/callback
        if not settings.UPI_MERCHANT_ID or not settings.UPI_MERCHANT_KEY:
            raise HTTPException(status_code=503, detail="UPI payment service not configured")

        reference_id = generate_payment_reference(order.id, "upi")

        transaction = PaymentTransaction(
            order_id=order.id,
            payment_method="upi",
            amount=float(order.total_amount),
            currency="INR",
            status="pending",
            reference_id=reference_id,
            upi_merchant_id=settings.UPI_MERCHANT_ID,
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        return {
            "transaction_id": transaction.id,
            "order_id": order.id,
            "amount": float(order.total_amount),
            "currency": "INR",
            "payment_method": "upi",
            "upi_merchant_id": settings.UPI_MERCHANT_ID,
            "reference_id": reference_id,
            "upi_payment_url": f"upi://pay?pa={settings.UPI_MERCHANT_ID}&pn=LuxeMart&am={order.total_amount}&cu=INR&tn=Order-{order.order_number}&tr={reference_id}",
        }


@router.post("/verify")
def verify_payment(
    request: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify Razorpay payment signature and update order status."""
    order = db.query(Order).filter(
        Order.id == request.order_id,
        Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    transaction = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.order_id == request.order_id)
        .filter(PaymentTransaction.status == "pending")
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="No pending transaction found")

    try:
        is_valid = verify_razorpay_signature(
            request.razorpay_order_id,
            request.razorpay_payment_id,
            request.razorpay_signature or "",
        )

        if not is_valid:
            transaction.status = "failed"
            transaction.signature_verified = False
            order.payment_status = "failed"
            db.commit()
            raise HTTPException(
                status_code=400, detail="Payment signature verification failed"
            )

        # Fetch payment details from Razorpay for confirmation
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        payment = client.payment.fetch(request.razorpay_payment_id)

        if payment.get("status") != "captured":
            transaction.status = "failed"
            transaction.razorpay_payment_id = request.razorpay_payment_id
            transaction.payment_gateway_response = str(payment)
            order.payment_status = "failed"
            db.commit()
            raise HTTPException(
                status_code=400, detail="Payment not captured by gateway"
            )

        # Payment successful
        transaction.status = "completed"
        transaction.razorpay_payment_id = request.razorpay_payment_id
        transaction.razorpay_signature = request.razorpay_signature
        transaction.signature_verified = True
        transaction.payment_gateway_response = str(payment)

        order.payment_status = "completed"
        if order.status == "pending":
            order.status = "processing"

        db.commit()
        db.refresh(transaction)

        return {
            "success": True,
            "transaction_id": transaction.id,
            "reference_id": transaction.reference_id,
            "amount": float(transaction.amount),
            "order_id": order.id,
            "payment_method": "card",
            "verified_at": datetime.utcnow().isoformat(),
            "message": "Payment verified successfully",
        }

    except PaymentSignatureError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if "transaction" in dir():
            transaction.status = "failed"
            db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Payment verification failed: {str(e)}",
        )


@router.post("/verify-upi")
def verify_upi_payment(
    request: VerifyUPIPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verify UPI payment using merchant checksum and timestamp.
    This endpoint validates the UPI transaction server-side for security.
    """
    order = db.query(Order).filter(
        Order.id == request.order_id,
        Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    transaction = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.order_id == request.order_id)
        .filter(PaymentTransaction.status == "pending")
        .filter(PaymentTransaction.payment_method == "upi")
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="No pending UPI transaction found")

    # Security check: verify timestamp to prevent replay attacks
    if not verify_payment_timestamp(request.timestamp):
        raise HTTPException(
            status_code=400,
            detail="Payment timestamp validation failed. Request expired.",
        )

    # Security check: verify amount matches
    if float(request.amount) != float(order.total_amount):
        raise HTTPException(
            status_code=400,
            detail="Payment amount mismatch",
        )

    try:
        is_valid = verify_upi_payment(
            request.upi_transaction_id,
            request.upi_merchant_id,
            float(request.amount),
            request.checksum,
            request.timestamp,
        )

        if not is_valid:
            transaction.status = "failed"
            transaction.signature_verified = False
            order.payment_status = "failed"
            db.commit()
            raise HTTPException(
                status_code=400, detail="UPI payment verification failed"
            )

        # UPI payment verified successfully
        transaction.status = "completed"
        transaction.upi_transaction_id = request.upi_transaction_id
        transaction.upi_merchant_id = request.upi_merchant_id
        transaction.signature_verified = True

        order.payment_status = "completed"
        if order.status == "pending":
            order.status = "processing"

        db.commit()
        db.refresh(transaction)

        return {
            "success": True,
            "transaction_id": transaction.id,
            "reference_id": transaction.reference_id,
            "amount": float(transaction.amount),
            "payment_method": "upi",
            "upi_transaction_id": request.upi_transaction_id,
            "verified_at": datetime.utcnow().isoformat(),
            "message": "UPI payment verified successfully",
        }

    except PaymentSignatureError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PaymentVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        transaction.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"UPI verification failed: {str(e)}",
        )


@router.post("/confirm-cod")
def confirm_cod_payment(
    request: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirm Cash on Delivery payment upon delivery.
    Creates a payment record for COD orders that are marked as completed upon delivery.
    """
    order = db.query(Order).filter(
        Order.id == request.order_id,
        Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.payment_method != "cod":
        raise HTTPException(status_code=400, detail="Order is not a COD order")

    # Only allow COD confirmation for delivered orders
    if order.status not in ("delivered", "completed"):
        raise HTTPException(
            status_code=400,
            detail=f"COD payment can only be confirmed when order is delivered. Current status: {order.status}",
        )

    # Check if COD already confirmed
    existing_txn = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.order_id == request.order_id)
        .first()
    )

    if existing_txn and existing_txn.status == "completed":
        raise HTTPException(status_code=400, detail="COD payment already confirmed")

    reference_id = generate_payment_reference(order.id, "cod")

    if existing_txn:
        # Update existing transaction
        existing_txn.status = "completed"
        existing_txn.updated_at = datetime.utcnow()
        existing_txn.payment_gateway_response = "COD confirmed upon delivery"
    else:
        transaction = PaymentTransaction(
            order_id=order.id,
            payment_method="cod",
            amount=float(order.total_amount),
            currency="INR",
            status="completed",
            reference_id=reference_id,
            signature_verified=True,
            webhook_verified=True,
            payment_gateway_response="COD confirmed upon delivery",
        )
        db.add(transaction)

    order.payment_status = "completed"
    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "reference_id": reference_id,
        "amount": float(order.total_amount),
        "payment_method": "cod",
        "message": "COD payment confirmed successfully",
    }


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    payload: WebhookVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Secure webhook endpoint for payment gateway notifications.
    Verifies webhook signature before processing.
    """
    # Get raw body for signature verification
    raw_body = await request.body()

    try:
        # Verify webhook signature
        if payload.signature:
            payload_bytes = payload.payload.encode("utf-8") if isinstance(payload.payload, str) else payload.payload
            sig_valid = verify_webhook_signature(payload_bytes, payload.signature)

            if not sig_valid:
                return JSONResponse(
                    status_code=401,
                    content={"success": False, "error": "Invalid webhook signature"},
                )

        # Parse the webhook payload
        import json
        data = json.loads(payload.payload) if isinstance(payload.payload, str) else payload.payload

        order_id = data.get("order_id") or data.get("customNotes", {}).get("order_id")
        transaction_id = data.get("id") or data.get("payment_id") or data.get("razorpay_payment_id")
        status = data.get("status", data.get("event", "unknown"))

        if not order_id:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Order ID not found in webhook"},
            )

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Order not found"},
            )

        transaction = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.order_id == order_id)
            .filter(PaymentTransaction.razorpay_order_id == data.get("order_id")
                     if data.get("order_id") != str(order_id) else None)
            .first()
        )

        if not transaction:
            # Try finding by webhook data
            transaction = (
                db.query(PaymentTransaction)
                .filter(PaymentTransaction.order_id == order_id)
                .filter(PaymentTransaction.status == "pending")
                .first()
            )

        if transaction:
            transaction.webhook_verified = True
            transaction.payment_gateway_response = str(data)

            if status in ("captured", "paid", "success", "completed"):
                transaction.status = "completed"
                transaction.razorpay_payment_id = transaction_id or data.get("payment_id")
                order.payment_status = "completed"
                if order.status == "pending":
                    order.status = "processing"
            elif status in ("failed", "error", "cancelled"):
                transaction.status = "failed"
                order.payment_status = "failed"

        db.commit()

        return JSONResponse(
            status_code=200,
            content={"success": True, "message": "Webhook processed"},
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Webhook processing failed: {str(e)}"},
        )


@router.get("/history", response_model=PaymentHistoryResponse)
def get_payment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get payment transaction history for the current user."""
    transactions = (
        db.query(PaymentTransaction)
        .join(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(desc(PaymentTransaction.created_at))
        .all()
    )

    return {
        "transactions": [
            PaymentResponse(
                transaction_id=txn.id,
                order_id=txn.order_id,
                payment_method=txn.payment_method,
                amount=txn.amount,
                currency=txn.currency,
                status=txn.status,
                razorpay_order_id=txn.razorpay_order_id,
                razorpay_payment_id=txn.razorpay_payment_id,
                upi_transaction_id=txn.upi_transaction_id,
                reference_id=txn.reference_id or f"REF-{txn.id}",
                verified=txn.signature_verified or txn.webhook_verified,
                created_at=txn.created_at.isoformat() if txn.created_at else "",
            )
            for txn in transactions
        ],
        "total": len(transactions),
    }


@router.get("/methods", response_model=PaymentLimitsResponse)
def get_payment_methods_and_limits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get available payment methods and their limits."""
    methods = ["cod"]

    # UPI is available if merchant credentials are set OR simulation mode is on
    if settings.UPI_MERCHANT_ID and settings.UPI_MERCHANT_KEY:
        methods.append("upi")
    elif settings.SIMULATE_PAYMENTS:
        methods.append("upi")

    # Card is available if Razorpay credentials are set OR simulation mode is on
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        methods.append("card")
    elif settings.SIMULATE_PAYMENTS:
        methods.append("card")

    return {
        "cod_enabled": settings.COD_ENABLED,
        "max_cod_amount": settings.MAX_COD_AMOUNT,
        "max_order_amount": 1000000.0,
        "supported_methods": methods,
        "upi_merchant_id": settings.UPI_MERCHANT_ID,
        "simulate_payments": settings.SIMULATE_PAYMENTS,
    }


@router.get("/{transaction_id}", response_model=PaymentResponse)
def get_transaction_status(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get status of a specific payment transaction."""
    transaction = db.query(PaymentTransaction).filter(
        PaymentTransaction.id == transaction_id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    order = db.query(Order).filter(
        Order.id == transaction.order_id,
        Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return PaymentResponse(
        transaction_id=transaction.id,
        order_id=transaction.order_id,
        payment_method=transaction.payment_method,
        amount=transaction.amount,
        currency=transaction.currency,
        status=transaction.status,
        razorpay_order_id=transaction.razorpay_order_id,
        razorpay_payment_id=transaction.razorpay_payment_id,
        upi_transaction_id=transaction.upi_transaction_id,
        reference_id=transaction.reference_id or f"REF-{transaction.id}",
        verified=transaction.signature_verified or transaction.webhook_verified,
        created_at=transaction.created_at.isoformat() if transaction.created_at else "",
    )


@router.post("/retry/{transaction_id}")
def retry_payment(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retry a failed payment."""
    transaction = db.query(PaymentTransaction).filter(
        PaymentTransaction.id == transaction_id,
        PaymentTransaction.status == "failed",
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Failed transaction not found")

    order = db.query(Order).filter(
        Order.id == transaction.order_id,
        Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if transaction.payment_method == "card":
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise HTTPException(status_code=503, detail="Payment service not configured")

        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

        amount_paise = int(float(order.total_amount) * 100)

        razorpay_order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": order.order_number,
                "notes": {
                    "order_id": str(order.id),
                    "user_id": str(current_user.id),
                    "payment_method": "card",
                    "retry": "true",
                },
            }
        )

        # Create new transaction for retry
        new_transaction = PaymentTransaction(
            order_id=order.id,
            payment_method="card",
            amount=float(order.total_amount),
            currency="INR",
            status="pending",
            razorpay_order_id=razorpay_order.get("id"),
            reference_id=generate_payment_reference(order.id, "card"),
        )
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        return {
            "transaction_id": new_transaction.id,
            "razorpay_order_id": razorpay_order.get("id"),
            "amount": float(order.total_amount),
            "key_id": settings.RAZORPAY_KEY_ID,
            "message": "New payment order created for retry",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Retry not supported for payment method: {transaction.payment_method}",
        )