# LuxeMart - AI-Powered E-Commerce Platform

## Quick Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL database

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with:
# DATABASE_URL=postgresql://user:password@localhost/ecommerce
# JWT_SECRET=your-secret-key

python main.py
# Backend runs at http://localhost:8000
```

### Frontend Setup
```bash
cd frontend
npm install
# Create .env:
# VITE_API_URL=http://localhost:8000

npm run dev
# Frontend runs at http://localhost:5173
```

### Database
The tables are auto-created on first run. Add sample products via admin panel.

## Features
- JWT Authentication
- Cart & Wishlist
- AI Recommendations
- Product Search
- Admin Dashboard

## Tech Stack
- Frontend: React + Vite + Tailwind + Framer Motion
- Backend: FastAPI + SQLAlchemy + PostgreSQL
