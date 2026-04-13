# LuxeMart - AI-Powered E-Commerce Platform

A premium full-stack e-commerce application built with React (Frontend) and FastAPI (Backend).

## Features

- **User Authentication** - JWT-based auth with registration, login, password reset
- **Product Catalog** - Browse products by category (Electronics, Fashion, Furniture)
- **AI Assistant** - AI-powered chat for product recommendations
- **Shopping Cart** - Add/remove items, apply coupons
- **Wishlist** - Save favorite products
- **Order Management** - Track orders and order history
- **Checkout & Payments** - Secure checkout flow
- **Admin Dashboard** - Manage products, orders, and users

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Framer Motion
- React Router DOM

### Backend
- FastAPI
- PostgreSQL + SQLAlchemy
- JWT Authentication
- Python 3.11+

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
# Update DATABASE_URL in .env
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Deployment

See [SETUP_AND_DEPLOYMENT.md](./SETUP_AND_DEPLOYMENT.md) for production deployment instructions.

## License

MIT