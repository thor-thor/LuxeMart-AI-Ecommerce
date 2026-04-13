from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.routers import auth, products, cart, wishlist, orders, admin, addresses, coupons, payments, ai

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LuxeMart API",
    description="AI-Powered E-Commerce Platform API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://*.vercel.app", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(wishlist.router)
app.include_router(orders.router)
app.include_router(addresses.router)
app.include_router(coupons.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(ai.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "LuxeMart API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)