"""
Secure Payment Utility Module
Handles payment signature verification, UPI payment processing,
webhook validation, and payment security checks.
"""

import hmac
import hashlib
import time
from typing import Optional, Dict, Any

from app.core.config import settings


class PaymentSignatureError(Exception):
    """Raised when payment signature verification fails."""
    pass


class PaymentVerificationError(Exception):
    """Raised when payment verification fails."""
    pass


class PaymentSecurityError(Exception):
    """Raised when a security check fails."""
    pass


def verify_razorpay_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    secret: Optional[str] = None
) -> bool:
    """
    Verify Razorpay payment signature using HMAC-SHA256.
    
    Args:
        razorpay_order_id: The Razorpay order ID
        razorpay_payment_id: The Razorpay payment ID
        razorpay_signature: The signature provided by Razorpay
        secret: Optional override for the Razorpay secret key
    
    Returns:
        bool: True if signature is valid, False otherwise
    
    Raises:
        PaymentSignatureError: If secret is not configured
    """
    secret_key = secret or settings.RAZORPAY_KEY_SECRET
    if not secret_key:
        raise PaymentSignatureError("Razorpay secret key not configured")
    
    generated_signature = hmac.new(
        secret_key.encode('utf-8'),
        f"{razorpay_order_id}|{razorpay_payment_id}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(generated_signature, razorpay_signature)


def verify_upi_payment(
    upi_transaction_id: str,
    merchant_id: str,
    amount: float,
    provided_checksum: str,
    timestamp: int
) -> bool:
    """
    Verify UPI payment checksum using HMAC-SHA256.
    
    Args:
        upi_transaction_id: UPI transaction reference ID
        merchant_id: Merchant identifier
        amount: Transaction amount
        provided_checksum: Checksum provided by payment app
        timestamp: Unix timestamp of the transaction
    
    Returns:
        bool: True if checksum is valid
    """
    merchant_key = settings.UPI_MERCHANT_KEY
    if not merchant_key:
        raise PaymentSignatureError("UPI merchant key not configured")
    
    # Construct the verification string
    verification_string = f"{upi_transaction_id}|{merchant_id}|{amount:.2f}|{timestamp}"
    
    expected_checksum = hmac.new(
        merchant_key.encode('utf-8'),
        verification_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_checksum, provided_checksum)


def verify_webhook_signature(
    payload: bytes,
    signature: str,
    webhook_secret: Optional[str] = None
) -> bool:
    """
    Verify webhook signature for payment notifications.
    
    Args:
        payload: Raw request body bytes
        signature: Signature header from the webhook
        webhook_secret: Optional override for webhook secret
    
    Returns:
        bool: True if webhook signature is valid
    """
    secret = webhook_secret or settings.WEBHOOK_SECRET
    if not secret:
        raise PaymentSignatureError("Webhook secret not configured")
    
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected_signature}", signature)


def verify_payment_timestamp(
    timestamp: int,
    tolerance_seconds: int = 300
) -> bool:
    """
    Verify that a payment timestamp is within an acceptable window.
    Prevents replay attacks.
    
    Args:
        timestamp: Unix timestamp from the payment
        tolerance_seconds: Maximum allowed age in seconds (default 5 min)
    
    Returns:
        bool: True if timestamp is within tolerance
    """
    current_time = int(time.time())
    time_difference = abs(current_time - timestamp)
    return time_difference <= tolerance_seconds


def check_payment_limits(
    amount: float,
    payment_method: str,
    user_verified: bool = True
) -> Dict[str, Any]:
    """
    Validate payment against configured limits.
    
    Args:
        amount: Payment amount
        payment_method: Payment method identifier
        user_verified: Whether the user is KYC verified
    
    Returns:
        Dict with 'allowed' (bool) and 'reason' (str) if blocked
    """
    if payment_method == "cod":
        if not settings.COD_ENABLED:
            return {
                "allowed": False,
                "reason": "Cash on Delivery is currently disabled"
            }
        if amount > settings.MAX_COD_AMOUNT:
            return {
                "allowed": False,
                "reason": f"COD not available for orders above Rs. {settings.MAX_COD_AMOUNT:,.2f}"
            }
    
    if amount <= 0:
        return {
            "allowed": False,
            "reason": "Invalid payment amount"
        }
    
    # Maximum order limit for security
    MAX_ORDER_AMOUNT = 1000000.0  # Rs. 10 lakhs
    if amount > MAX_ORDER_AMOUNT:
        return {
            "allowed": False,
            "reason": f"Order amount exceeds maximum limit of Rs. {MAX_ORDER_AMOUNT:,.2f}"
        }
    
    return {"allowed": True}


def sanitize_payment_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize payment data before logging, masking sensitive fields.
    
    Args:
        data: Raw payment data dictionary
    
    Returns:
        Sanitized dictionary with sensitive fields masked
    """
    sensitive_fields = [
        'razorpay_signature', 'razorpay_payment_id',
        'upi_transaction_id', 'upi_merchant_id',
        'merchant_key', 'webhook_secret', 'card_number',
        'cvv', 'expiry', 'bank_reference'
    ]
    
    sanitized = {}
    for key, value in data.items():
        if key in sensitive_fields and value:
            sanitized[key] = f"***{str(value)[-4:]}" if len(str(value)) > 4 else "****"
        else:
            sanitized[key] = value
    
    return sanitized


def generate_payment_reference(order_id: int, method: str) -> str:
    """
    Generate a unique payment reference ID.
    
    Args:
        order_id: The database order ID
        method: Payment method (cod, upi, card)
    
    Returns:
        Unique payment reference string
    """
    timestamp = int(time.time() * 1000)
    random_part = hashlib.sha256(
        f"{order_id}{method}{timestamp}".encode()
    ).hexdigest()[:12]
    
    return f"PAY-{method.upper()}-{order_id}-{timestamp}-{random_part}"


def validate_payment_method(method: str) -> bool:
    """
    Validate that a payment method is supported.
    
    Args:
        method: Payment method identifier
    
    Returns:
        bool: True if method is valid
    """
    valid_methods = {"cod", "upi", "card"}
    return method.lower() in valid_methods