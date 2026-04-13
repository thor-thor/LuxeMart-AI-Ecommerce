from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(UserBase):
    id: int
    full_name: Optional[str]
    phone: Optional[str]
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int
    username: str


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    category: str
    subcategory: Optional[str] = None
    image_url: Optional[str] = None
    stock: int = 0
    is_featured: bool = False
    is_new: bool = False


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    rating: float
    review_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    id: int
    name: str
    price: float
    original_price: Optional[float]
    category: str
    image_url: Optional[str]
    rating: float
    review_count: int
    is_featured: bool
    is_new: bool
    
    class Config:
        from_attributes = True


class CartItemBase(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductResponse
    
    class Config:
        from_attributes = True


class WishlistItemResponse(BaseModel):
    id: int
    product_id: int
    product: ProductResponse
    
    class Config:
        from_attributes = True


class ReviewBase(BaseModel):
    product_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewCreate(ReviewBase):
    pass


class ReviewResponse(ReviewBase):
    id: int
    user_id: int
    user: UserResponse
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float
    product: ProductResponse
    
    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    payment_method: str = "card"
    upi_id: Optional[str] = None
    shipping_address: str
    buy_now_product_id: Optional[int] = None
    buy_now_quantity: Optional[int] = None


class OrderResponse(BaseModel):
    id: int
    order_number: str
    total_amount: float
    status: str
    payment_method: str
    payment_status: str
    shipping_address: str
    created_at: datetime
    items: List[OrderItemResponse] = []
    
    class Config:
        from_attributes = True


class SearchSuggestion(BaseModel):
    query: str
    products: List[str] = []


class RecommendationResponse(BaseModel):
    products: List[ProductListResponse]


class OrderStatusUpdate(BaseModel):
    status: str
    payment_status: Optional[str] = None


class AnalyticsResponse(BaseModel):
    total_revenue: float
    total_orders: int
    pending_orders: int
    completed_orders: int
    total_products: int
    total_users: int
    top_products: List[ProductListResponse]
    recent_orders: List[OrderResponse]


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    google_id: str
    photo_url: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(..., min_length=8)


class ForgotPasswordOTPRequest(BaseModel):
    email: EmailStr


class ResetPasswordOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=8)


class AddressCreate(BaseModel):
    name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: bool = False


class AddressResponse(BaseModel):
    id: int
    name: str
    phone: str
    address_line1: str
    address_line2: Optional[str]
    city: str
    state: str
    pincode: str
    is_default: bool
    
    class Config:
        from_attributes = True


class CouponApplyRequest(BaseModel):
    code: str


class CouponResponse(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: float
    
    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]