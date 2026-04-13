# LuxeMart Setup and Deployment Guide

Follow these comprehensive steps to set up the Application locally for development, and deploy it to the internet for production.

## 0. Prerequisites
1. **Node.js 18+** (for frontend)
2. **Python 3.11+** (for backend)
3. **PostgreSQL** Server (running locally or a Cloud instance like Supabase/Neon/Render).

---

## 1. Local Development Setup

### A. Database Initialization
1. Ensure your PostgreSQL server is running.
2. Open a terminal or pgAdmin, and run the schema file:
   ```bash
   psql -U your_postgres_user -f backend/database.sql
   ```
   *Note: This creates a database named `luxemart`, creates the required tables, inserts sample products, and creates an admin user `admin@luxemart.com` (password: `admin123`).*

### B. Backend (FastAPI) Setup
1. CD into the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Virtual Environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Update `.env` inside the `backend` folder. Adjust `DATABASE_URL` if your local Postgres instance uses a different username/password/host:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/luxemart
   JWT_SECRET=your_super_secret_jwt_key
   ```
5. Run the Backend Server:
   ```bash
   uvicorn main:app --reload
   ```
   *API will run at [http://localhost:8000](http://localhost:8000). Swagger documentation is found at [http://localhost:8000/docs](http://localhost:8000/docs).*

### C. Frontend (React + Vite) Setup
1. CD into the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Update `.env` in the `frontend` directory if necessary (by default `VITE_API_URL` points to `http://localhost:8000`).
4. Start the frontend web app:
   ```bash
   npm run dev
   ```
   *App will compile and launch, by default at [http://localhost:5173](http://localhost:5173).*

---

## 2. Production Deployment

### A. Database (PostgreSQL)
1. Use **Neon.tech**, **Supabase**, or **Render PostgreSQL** to create a free PostgreSQL database.
2. Run the `backend/database.sql` script into your newly created cloud database.
3. Grab the generated Database URL (e.g., `postgresql://...`).

### B. Backend Node on Render or Railway
1. Push this entire repository to GitHub.
2. Go to **Render** or **Railway** and create a newly hosted **Web Service**.
3. Select your GitHub repository.
4. Set the Root Directory to `backend` (if available) or supply a custom startup script.
5. Setup the execution configurations:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Put the production `DATABASE_URL` and `JWT_SECRET` in the Platform's Environment Variables tab.
7. Grab the deployed Backend URL (e.g., `https://luxemart-api.onrender.com`).

### C. Frontend on Vercel or Netlify
1. Go to **Vercel** or **Netlify** and import your repository.
2. Point the **Root Directory** to `frontend`.
3. Set the Environment variable to match your *Deployed Backend* URL before building:
   - `VITE_API_URL=https://luxemart-api.onrender.com`
4. Deploy the application. Vercel automatically runs `npm run build` by default.

---

## Conclusion
You now have a fully functioning AI-Powered E-commerce website running seamlessly across Frontend and Backend with interactive images, secure auth, real databases, and elegant interfaces.
