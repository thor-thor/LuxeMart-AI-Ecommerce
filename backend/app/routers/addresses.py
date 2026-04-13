from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, Address
from app.schemas.schemas import AddressCreate, AddressResponse

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])


@router.get("", response_model=List[AddressResponse])
def get_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Address).filter(Address.user_id == current_user.id).order_by(Address.is_default.desc(), Address.created_at.desc()).all()


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def add_address(
    address_data: AddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if address_data.is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})
    
    address = Address(
        user_id=current_user.id,
        name=address_data.name,
        phone=address_data.phone,
        address_line1=address_data.address_line1,
        address_line2=address_data.address_line2,
        city=address_data.city,
        state=address_data.state,
        pincode=address_data.pincode,
        is_default=address_data.is_default,
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: int,
    address_data: AddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id,
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    if address_data.is_default:
        db.query(Address).filter(
            Address.user_id == current_user.id,
            Address.id != address_id,
        ).update({"is_default": False})
    
    address.name = address_data.name
    address.phone = address_data.phone
    address.address_line1 = address_data.address_line1
    address.address_line2 = address_data.address_line2
    address.city = address_data.city
    address.state = address_data.state
    address.pincode = address_data.pincode
    address.is_default = address_data.is_default
    
    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id,
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()


@router.put("/{address_id}/default", response_model=AddressResponse)
def set_default_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id,
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address