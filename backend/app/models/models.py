from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(255))
    phone = Column(String(20))
    is_admin = Column(Boolean, default=False)
    is_oauth = Column(Boolean, default=False)
    oauth_provider = Column(String(50), nullable=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    reset_otp = Column(String(10), nullable=True)
    reset_otp_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    original_price = Column(Numeric(10, 2))
    category = Column(String(50), nullable=False, index=True)
    subcategory = Column(String(50))
    image_url = Column(String(500))
    stock = Column(Integer, default=0)
    rating = Column(Numeric(3, 2), default=0)
    review_count = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    is_new = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    cart_items = relationship("CartItem", back_populates="product")
    wishlist_items = relationship("WishlistItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")


class CartItem(Base):
    __tablename__ = "cart_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")
    
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_user_product_cart"),)


class WishlistItem(Base):
    __tablename__ = "wishlist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="wishlist_items")
    product = relationship("Product", back_populates="wishlist_items")
    
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_user_product_wishlist"),)


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_number = Column(String(50), unique=True, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default="pending")
    payment_method = Column(String(50))
    payment_status = Column(String(50), default="pending")
    shipping_address = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")
    
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_user_product_review"),)


class Address(Base):
    __tablename__ = "addresses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255))
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User")


class Coupon(Base):
    __tablename__ = "coupons"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(String(20), nullable=False)
    discount_value = Column(Numeric(10, 2), nullable=False)
    min_order_amount = Column(Numeric(10, 2), default=0)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    valid_from = Column(DateTime, nullable=False)
    valid_until = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())