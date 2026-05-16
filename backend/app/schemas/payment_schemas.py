from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal


class PaymentRequest(BaseModel):
    order_id: int
    payment_method: str  # cod, upi, card
    upi_transaction_id: Optional[str] = None
    upi_merchant_id: Optional[str] = None
    upi_checksum: Optional[str] = None
    upi_timestamp: Optional[int] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    webhook_payload: Optional[str] = None
    webhook_signature: Optional[str] = None


class PaymentResponse(BaseModel):
    transaction_id: int
    order_id: int
    payment_method: str
    amount: Decimal
    currency: str = "INR"
    status: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    upi_transaction_id: Optional[str] = None
    reference_id: str
    verified: bool
    created_at: str


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    order_id: int
    razorpay_signature: Optional[str] = None


class VerifyUPIPaymentRequest(BaseModel):
    order_id: int
    upi_transaction_id: str
    upi_merchant_id: str
    amount: Decimal
    checksum: str
    timestamp: int


class WebhookVerifyRequest(BaseModel):
    payload: str
    signature: str
    event_type: str


class PaymentHistoryResponse(BaseModel):
    transactions: list[PaymentResponse]
    total: int


class PaymentLimitsResponse(BaseModel):
    cod_enabled: bool
    max_cod_amount: float
    max_order_amount: float
    supported_methods: list[str] = ["cod", "upi", "card"]