from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import secrets
import os
import random
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.email_service import send_password_reset_email, send_otp_reset_email
from app.models.models import User
from app.schemas.schemas import UserCreate, UserResponse, Token, GoogleAuthRequest, ForgotPasswordRequest, ResetPasswordRequest, ForgotPasswordOTPRequest, ResetPasswordOTPRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    from sqlalchemy import or_, func
    print(f"DEBUG LOGIN: Received username='{form_data.username}', password='{form_data.password}'")
    user = db.query(User).filter(
        or_(
            func.lower(User.email) == func.lower(form_data.username),
            func.lower(User.username) == func.lower(form_data.username)
        )
    ).first()
    if user:
        is_valid = verify_password(form_data.password, user.password_hash)
        print(f"DEBUG LOGIN: Found user ID={user.id}, Hash={user.password_hash}, PassValid={is_valid}")
    else:
        print(f"DEBUG LOGIN: User not found in DB")
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in with Google",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "username": user.username})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "username": user.username})
    
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/google-auth", response_model=Token)
def google_auth(google_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate or register user via Google."""
    existing_user = None
    
    if google_data.google_id:
        existing_user = db.query(User).filter(User.google_id == google_data.google_id).first()
    
    if not existing_user:
        existing_user = db.query(User).filter(User.email == google_data.email).first()
    
    if existing_user:
        is_oauth = existing_user.is_oauth if existing_user.is_oauth is not None else False
        google_id = existing_user.google_id if existing_user.google_id else ""
        
        if is_oauth and not google_id:
            existing_user.google_id = google_data.google_id
            existing_user.oauth_provider = "google"
            db.commit()
        elif not is_oauth:
            raise HTTPException(
                status_code=400,
                detail="Email already registered. Please login with your password or use Google to sign up.",
            )
    else:
        username = google_data.email.split('@')[0]
        base_username = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        existing_user = User(
            email=google_data.email,
            username=username,
            full_name=google_data.name,
            password_hash=None,
            is_oauth=True,
            oauth_provider="google",
            google_id=google_data.google_id,
        )
        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)
    
    access_token = create_access_token(data={"sub": str(existing_user.id), "username": existing_user.username})
    refresh_token = create_refresh_token(data={"sub": str(existing_user.id), "username": existing_user.username})
    
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email."""
    user = db.query(User).filter(func.lower(User.email) == func.lower(request.email)).first()
    
    if not user:
        return {"message": "If the email exists, a password reset link will be sent."}
    
    is_oauth = user.is_oauth if user.is_oauth is not None else False
    has_password = user.password_hash is not None and user.password_hash != ""
    
    if is_oauth and not has_password:
        return {"message": "This account is linked to Google. Please sign in with Google."}
    
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    
    user.password_reset_token = token
    user.password_reset_expires = expires
    db.commit()
    
    reset_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token={token}&email={user.email}"
    
    import asyncio
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(send_password_reset_email(
            customer_email=user.email,
            customer_name=user.full_name or "",
            reset_link=reset_link,
        ))
        print(f"Email result: {result}")
        loop.close()
    except Exception as e:
        print(f"Failed to send email: {e}")
    
    return {"message": "If the email exists, a password reset link will be sent."}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token."""
    user = db.query(User).filter(
        func.lower(User.email) == func.lower(request.email),
        User.password_reset_token == request.token
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    
    if user.password_reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired.")
    
    user.password_hash = get_password_hash(request.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    
    return {"message": "Password has been reset successfully."}


@router.post("/forgot-password-otp")
def forgot_password_otp(request: ForgotPasswordOTPRequest, db: Session = Depends(get_db)):
    """Send password reset OTP via email."""
    user = db.query(User).filter(func.lower(User.email) == func.lower(request.email)).first()
    
    if not user:
        return {"message": "If the email exists, a password reset OTP will be sent."}
    
    is_oauth = user.is_oauth if user.is_oauth is not None else False
    has_password = user.password_hash is not None and user.password_hash != ""
    
    if is_oauth and not has_password:
        return {"message": "This account is linked to Google. Please sign in with Google."}
    
    otp = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)
    
    user.reset_otp = otp
    user.reset_otp_expires = expires
    db.commit()
    
    import asyncio
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(send_otp_reset_email(
            customer_email=user.email,
            customer_name=user.full_name or "",
            otp=otp,
        ))
        print(f"Email result: {result}")
        loop.close()
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
    
    return {"message": "If the email exists, a password reset OTP will be sent.", "method": "otp"}


@router.post("/reset-password-otp")
def reset_password_otp(request: ResetPasswordOTPRequest, db: Session = Depends(get_db)):
    """Reset password using OTP."""
    user = db.query(User).filter(
        func.lower(User.email) == func.lower(request.email),
        User.reset_otp == request.otp
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
    
    if user.reset_otp_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired.")
    
    user.password_hash = get_password_hash(request.new_password)
    user.reset_otp = None
    user.reset_otp_expires = None
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    
    return {"message": "Password has been reset successfully."}