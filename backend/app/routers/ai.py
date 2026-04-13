import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Product
from app.schemas.schemas import ChatRequest
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/ai", tags=["AI"])

@router.post("/chat")
def chat_with_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY")
    
    # If the user has not provided an API Key yet, return a safe fallback message
    if not api_key:
        return {
            "reply": "Hello! I am your LuxeMart AI Assistant. I noticed that the Administrator hasn't configured my Gemini API key yet, so my cognitive functions are temporarily offline. However, I highly recommend browsing our 'Featured Products' collection!"
        }
        
    genai.configure(api_key=api_key)
    
    # Fetch top products for context
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
        model = genai.GenerativeModel('gemini-pro')
        
        # Build history
        history = [
            {"role": "user", "parts": [system_prompt]},
            {"role": "model", "parts": ["Understood. I am ready to assist LuxeMart customers."]}
        ]
        
        user_message = ""
        for msg in request.messages:
            role = "user" if msg.role == "user" else "model"
            if msg == request.messages[-1]:
                user_message = msg.content
            else:
                history.append({"role": role, "parts": [msg.content]})
                
        chat = model.start_chat(history=history)
        response = chat.send_message(user_message)
        
        return {"reply": response.text}
        
    except Exception as e:
        print("GenAI Error:", str(e))
        raise HTTPException(status_code=500, detail="The AI Assistant is currently unavailable.")
