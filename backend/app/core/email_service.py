import os
from jinja2 import Template
from typing import Optional, List
import aiosmtplib
from email.message import EmailMessage

from app.core.config import settings

SMTP_HOST = settings.SMTP_HOST or "smtp.gmail.com"
SMTP_PORT = settings.SMTP_PORT or 587
SMTP_USER = settings.SMTP_USER or ""
SMTP_PASSWORD = settings.SMTP_PASSWORD or ""
FROM_EMAIL = settings.FROM_EMAIL or SMTP_USER
FROM_NAME = settings.FROM_NAME or "LuxeMart"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


BASE_CSS = """
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 5px; }
    .header .logo-text { font-size: 18px; opacity: 0.9; }
    .content { padding: 30px; background: white; }
    .footer { background: #1a1a2e; color: white; padding: 20px; text-align: center; font-size: 12px; }
    .footer a { color: #667eea; text-decoration: none; }
    .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
    .order-details p { margin: 8px 0; }
    .order-details strong { color: #1a1a2e; }
    .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .items-table th { background: #667eea; color: white; padding: 12px; text-align: left; font-size: 14px; }
    .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
    .items-table tr:last-child td { border-bottom: none; }
    .total-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .total-box .amount { font-size: 28px; font-weight: bold; }
    .status-badge { display: inline-block; padding: 8px 20px; border-radius: 25px; font-weight: 600; font-size: 14px; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-processing { background: #cce5ff; color: #004085; }
    .status-shipped { background: #d4edda; color: #155724; }
    .status-out-for-delivery { background: #e2e3f5; color: #383d41; }
    .status-delivered { background: #d1ecf1; color: #0c5460; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
    .otp-code { background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e; border-radius: 8px; margin: 20px 0; }
    .tracking-link { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .tracking-link a { color: #667eea; font-weight: 600; }
    .address-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .social-links { margin-top: 15px; }
    .social-links a { display: inline-block; margin: 0 8px; color: white; }
</style>
"""


ORDER_CONFIRMATION_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed - LuxeMart</title>
    """ + BASE_CSS + """
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmed!</h1>
            <div class="logo-text">LuxeMart</div>
        </div>
        <div class="content">
            <p>Dear <strong>{{ customer_name }}</strong>,</p>
            <p style="margin: 15px 0;">Thank you for your order! We've received your order and it's being processed. You will receive updates as your order moves through the delivery stages.</p>
            
            <div class="order-details">
                <p><strong>Order Number:</strong> {{ order_number }}</p>
                <p><strong>Order Date:</strong> {{ order_date }}</p>
                <p><strong>Payment Method:</strong> {{ payment_method }}</p>
                <p><strong>Payment Status:</strong> <span class="status-badge status-{{ payment_status_class }}">{{ payment_status }}</span></p>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in items %}
                    <tr>
                        <td>{{ item.name }}</td>
                        <td>{{ item.quantity }}</td>
                        <td>Rs. {{ item.price }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            
            <div class="total-box">
                <div>Total Amount</div>
                <div class="amount">Rs. {{ total_amount }}</div>
            </div>
            
            <h3 style="margin-top: 20px; color: #1a1a2e;">Shipping Address</h3>
            <div class="address-box">
                {{ shipping_address }}
            </div>
            
            <div class="tracking-link">
                <p>Track your order: <a href="{{ tracking_url }}">Click here to track your order</a></p>
            </div>
        </div>
        <div class="footer">
            <p><strong>LuxeMart</strong> - Your Premium Shopping Destination</p>
            <p>Questions? Reply to this email or contact us at support@luxemart.com</p>
            <div class="social-links">
                <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">Instagram</a>
            </div>
            <p style="margin-top: 10px; opacity: 0.7;">© 2024 LuxeMart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

ORDER_STATUS_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Update - LuxeMart</title>
    """ + BASE_CSS + """
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Update</h1>
            <div class="logo-text">LuxeMart</div>
        </div>
        <div class="content">
            <p>Dear <strong>{{ customer_name }}</strong>,</p>
            <p style="margin: 15px 0;">Great news! Your order status has been updated.</p>
            
            <div class="order-details">
                <p><strong>Order Number:</strong> {{ order_number }}</p>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
                <span class="status-badge status-{{ status_class }}">{{ status_message }}</span>
            </div>
            
            {% if status_description %}
            <p style="margin: 15px 0;">{{ status_description }}</p>
            {% endif %}
            
            <div class="tracking-link">
                <p>Track your order: <a href="{{ tracking_url }}">Click here to track your order</a></p>
            </div>
            
            <p style="margin-top: 20px;">You can view your order details and track its progress in your LuxeMart account.</p>
        </div>
        <div class="footer">
            <p><strong>LuxeMart</strong> - Your Premium Shopping Destination</p>
            <p>Questions? Reply to this email or contact us at support@luxemart.com</p>
            <p style="margin-top: 10px; opacity: 0.7;">© 2024 LuxeMart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

PASSWORD_RESET_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - LuxeMart</title>
    """ + BASE_CSS + """
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
            <div class="logo-text">LuxeMart</div>
        </div>
        <div class="content">
            <p>Dear <strong>{{ customer_name }}</strong>,</p>
            <p style="margin: 15px 0;">We received a request to reset your password. Click the button below to create a new password:</p>
            
            <p style="text-align: center;">
                <a href="{{ reset_link }}" class="button">Reset Password</a>
            </p>
            
            <div class="order-details">
                <p><strong>This link will expire in {{ expires_minutes }} minutes.</strong></p>
                <p>If you didn't request a password reset, please ignore this email or contact support immediately if you have concerns about your account security.</p>
            </div>
            
            <p style="margin-top: 20px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea; font-size: 12px;">{{ reset_link }}</p>
        </div>
        <div class="footer">
            <p><strong>LuxeMart</strong> - Your Premium Shopping Destination</p>
            <p>Questions? Reply to this email or contact us at support@luxemart.com</p>
            <p style="margin-top: 10px; opacity: 0.7;">© 2024 LuxeMart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

OTP_RESET_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP - LuxeMart</title>
    """ + BASE_CSS + """
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset OTP</h1>
            <div class="logo-text">LuxeMart</div>
        </div>
        <div class="content">
            <p>Dear <strong>{{ customer_name }}</strong>,</p>
            <p style="margin: 15px 0;">We received a request to reset your password. Use the OTP below to reset your password:</p>
            
            <div class="otp-code">{{ otp }}</div>
            
            <div class="order-details">
                <p><strong>This OTP will expire in {{ expires_minutes }} minutes.</strong></p>
                <p>Do not share this OTP with anyone. If you didn't request a password reset, please ignore this email.</p>
            </div>
            
            <p style="margin-top: 20px;">Enter this OTP on the password reset page to create a new password.</p>
        </div>
        <div class="footer">
            <p><strong>LuxeMart</strong> - Your Premium Shopping Destination</p>
            <p>Questions? Reply to this email or contact us at support@luxemart.com</p>
            <p style="margin-top: 10px; opacity: 0.7;">© 2024 LuxeMart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

ORDER_TO_ADMIN_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Order - LuxeMart</title>
    """ + BASE_CSS + """
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Order Received!</h1>
            <div class="logo-text">LuxeMart Admin</div>
        </div>
        <div class="content">
            <div class="order-details">
                <p><strong>Order Number:</strong> {{ order_number }}</p>
                <p><strong>Customer:</strong> {{ customer_name }} ({{ customer_email }})</p>
                <p><strong>Total Amount:</strong> Rs. {{ total_amount }}</p>
                <p><strong>Payment Method:</strong> {{ payment_method }}</p>
                <p><strong>Payment Status:</strong> {{ payment_status }}</p>
            </div>
            
            <h3 style="margin-top: 15px;">Items</h3>
            <p>{{ items_text }}</p>
            
            <h3 style="margin-top: 15px;">Shipping Address</h3>
            <div class="address-box">
                {{ shipping_address }}
            </div>
        </div>
    </div>
</body>
</html>
"""


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """Send an email using SMTP."""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL] Would send to {to_email}: {subject}")
        return True
    
    msg = EmailMessage()
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(text_content or "Please enable HTML viewing", subtype="html")
    msg.add_alternative(html_content, subtype="html")
    
    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True,
        )
        print(f"[EMAIL] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to_email}: {e}")
        return False


async def send_order_confirmation(
    customer_email: str,
    customer_name: str,
    order_number: str,
    order_date: str,
    payment_method: str,
    payment_status: str,
    items: List[dict],
    total_amount: float,
    shipping_address: str,
    order_id: int = None,
) -> bool:
    """Send order confirmation email to customer."""
    items_data = []
    for item in items:
        items_data.append({
            "name": item["name"],
            "quantity": item["quantity"],
            "price": f"{item['price']:.2f}"
        })
    
    tracking_url = f"{FRONTEND_URL}/orders"
    if order_id:
        tracking_url = f"{FRONTEND_URL}/order/{order_id}"
    
    payment_status_class = payment_status.lower().replace(" ", "-")
    
    template = Template(ORDER_CONFIRMATION_HTML)
    html = template.render(
        customer_name=customer_name or "Valued Customer",
        order_number=order_number,
        order_date=order_date,
        payment_method=payment_method,
        payment_status=payment_status,
        payment_status_class=payment_status_class,
        items=items_data,
        total_amount=f"{total_amount:.2f}",
        shipping_address=shipping_address,
        tracking_url=tracking_url,
    )
    
    return await send_email(
        to_email=customer_email,
        subject=f"Order Confirmed - {order_number} | LuxeMart",
        html_content=html,
    )


async def send_order_status_update(
    customer_email: str,
    customer_name: str,
    order_number: str,
    status: str,
    order_id: int = None,
) -> bool:
    """Send order status update email to customer."""
    status_messages = {
        "pending": "Order Placed - Awaiting Processing",
        "processing": "Order Being Prepared",
        "shipped": "Order Shipped",
        "out_for_delivery": "Out for Delivery",
        "delivered": "Order Delivered",
        "cancelled": "Order Cancelled",
    }
    
    status_descriptions = {
        "pending": "Your order has been placed and is awaiting processing. We'll notify you once it ships.",
        "processing": "Your order is being prepared and will be shipped soon.",
        "shipped": "Your order has been shipped! You can track it using the link below.",
        "out_for_delivery": "Your order is out for delivery. The delivery person will contact you soon.",
        "delivered": "Your order has been delivered! Thank you for shopping with LuxeMart.",
        "cancelled": "Your order has been cancelled. If you have any questions, please contact us.",
    }
    
    status_class = status.lower().replace(" ", "-")
    status_message = status_messages.get(status, status.upper())
    status_description = status_descriptions.get(status, "")
    
    tracking_url = f"{FRONTEND_URL}/orders"
    if order_id:
        tracking_url = f"{FRONTEND_URL}/order/{order_id}"
    
    template = Template(ORDER_STATUS_HTML)
    html = template.render(
        customer_name=customer_name or "Valued Customer",
        order_number=order_number,
        status=status,
        status_class=status_class,
        status_message=status_message,
        status_description=status_description,
        tracking_url=tracking_url,
    )
    
    return await send_email(
        to_email=customer_email,
        subject=f"Order Update - {order_number}: {status_message} | LuxeMart",
        html_content=html,
    )


async def send_new_order_notification(
    admin_email: str,
    order_number: str,
    customer_name: str,
    customer_email: str,
    total_amount: float,
    payment_method: str,
    payment_status: str,
    items_text: str,
    shipping_address: str,
) -> bool:
    """Send new order notification to admin."""
    template = Template(ORDER_TO_ADMIN_HTML)
    html = template.render(
        order_number=order_number,
        customer_name=customer_name,
        customer_email=customer_email,
        total_amount=f"{total_amount:.2f}",
        payment_method=payment_method,
        payment_status=payment_status,
        items_text=items_text,
        shipping_address=shipping_address,
    )
    
    return await send_email(
        to_email=admin_email,
        subject=f"New Order - {order_number}",
        html_content=html,
    )


async def send_password_reset_email(
    customer_email: str,
    customer_name: str,
    reset_link: str,
    expires_minutes: int = 15,
) -> bool:
    """Send password reset email to customer."""
    template = Template(PASSWORD_RESET_HTML)
    html = template.render(
        customer_name=customer_name or "Customer",
        reset_link=reset_link,
        expires_minutes=expires_minutes,
    )
    
    return await send_email(
        to_email=customer_email,
        subject="Reset Your Password - LuxeMart",
        html_content=html,
    )


async def send_otp_reset_email(
    customer_email: str,
    customer_name: str,
    otp: str,
    expires_minutes: int = 15,
) -> bool:
    """Send OTP password reset email to customer."""
    template = Template(OTP_RESET_HTML)
    html = template.render(
        customer_name=customer_name or "Customer",
        otp=otp,
        expires_minutes=expires_minutes,
    )
    
    return await send_email(
        to_email=customer_email,
        subject="Your Password Reset OTP - LuxeMart",
        html_content=html,
    )