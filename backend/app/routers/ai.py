import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Product
from app.schemas.schemas import ChatRequest
from google import genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/ai", tags=["AI"])

@router.post("/chat")
def chat_with_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return {
            "reply": "Hello! I am your LuxeMart AI Assistant. I noticed that the Administrator hasn't configured my Gemini API key yet, so my cognitive functions are temporarily offline. However, I highly recommend browsing our 'Featured Products' collection!"
        }
        
    client = genai.Client(api_key=api_key)
    
    products = db.query(Product).filter(Product.stock > 0).limit(50).all()
    
    catalog_context = "LuxeMart Current Active Catalog:\n"
    for p in products:
        catalog_context += f"- {p.name} ({p.category}) - ${p.price}\n"
        
    system_prompt = f"""You are the LuxeMart AI Personal Shopping Assistant. 
You are elegant, sophisticated, and helpful. You recommend products from the catalog.
If a user asks for something we don't have, politely steer them to what we do have.

{catalog_context}
"""

    try:
        history = [
            {"role": "user", "content": system_prompt},
            {"role": "model", "content": "Understood. I am ready to assist LuxeMart customers."}
        ]
        
        for msg in request.messages[:-1]:
            history.append({"role": msg.role, "content": msg.content})
        
        user_message = request.messages[-1].content if request.messages else "Hello"
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            messages=history + [{"role": "user", "content": user_message}]
        )
        
        return {"reply": response.text}
        
    except Exception as e:
        print("GenAI Error:", str(e))
        raise HTTPException(status_code=500, detail="The AI Assistant is currently unavailable.")