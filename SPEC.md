# E-Commerce Application Specification

## Project Overview
- **Project Name**: LuxeMart - AI-Powered E-Commerce Platform
- **Type**: Full-stack E-Commerce Web Application
- **Core Functionality**: Premium online shopping with AI recommendations, cart management, and secure payments
- **Target Users**: Consumers seeking furniture, electronics, and fashion products online

---

## Tech Stack

### Frontend
- **Framework**: React.js 18 with Vite
- **Styling**: Tailwind CSS 3.4
- **Animations**: Framer Motion 11
- **HTTP Client**: Axios
- **State Management**: React Context + useReducer
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Routing**: React Router DOM 6

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT with python-jose
- **Password Hashing**: Passlib with bcrypt
- **CORS**: FastAPI CORS middleware

### Database
- **Host**: PostgreSQL (cloud instance)
- **Port**: 5432

---

## UI/UX Specification

### Color Palette
```css
:root {
  /* Primary Colors */
  --primary-50: #f0f9ff;
  --primary-100: #e0f2fe;
  --primary-500: #0ea5e9;
  --primary-600: #0284c7;
  --primary-700: #0369a1;
  
  /* Secondary/Accent */
  --accent-500: #f59e0b;
  --accent-600: #d97706;
  
  /* Neutral */
  --neutral-50: #fafafa;
  --neutral-100: #f5f5f5;
  --neutral-200: #e5e5e5;
  --neutral-300: #d4d4d4;
  --neutral-400: #a3a3a3;
  --neutral-500: #737373;
  --neutral-600: #525252;
  --neutral-700: #404040;
  --neutral-800: #262626;
  --neutral-900: #171717;
  
  /* Semantic */
  --success: #22c55e;
  --error: #ef4444;
  --warning: #f59e0b;
  
  /* Dark Mode */
  --dark-bg: #0f0f0f;
  --dark-surface: #1a1a1a;
  --dark-card: #262626;
}
```

### Typography
- **Headings**: "Clash Display", sans-serif (from CDN)
- **Body**: "Satoshi", sans-serif (from CDN)
- **Font Sizes**:
  - xs: 12px
  - sm: 14px
  - base: 16px
  - lg: 18px
  - xl: 20px
  - 2xl: 24px
  - 3xl: 30px
  - 4xl: 36px
  - 5xl: 48px
  - 6xl: 60px

### Layout Structure

#### Header (Fixed)
- Logo (left)
- Search bar with AI suggestions (center)
- Navigation links (Shop, Categories, Deals)
- User actions (Cart, Wishlist, Profile)
- Dark mode toggle (right)
- Height: 72px

#### Hero Section
- Full-width carousel with 3 slides
- Auto-advance every 5 seconds
- Product featured with call-to-action
- Height: 500px (desktop), 350px (mobile)

#### Product Grid
- 4 columns (desktop)
- 3 columns (tablet)
- 2 columns (mobile)
- Gap: 24px
- Card aspect ratio maintained

#### Footer
- 4-column layout
- Newsletter signup
- Social links
- Copyright

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Components

#### Product Card
- Image container (aspect 4:3)
- Hover: scale(1.02), shadow elevation
- Category badge (top-left)
- Wishlist button (top-right)
- Product name
- Price (original + discounted)
- Rating stars
- Add to cart button
- States: default, hover, loading

#### Navigation Bar
- Sticky on scroll
- Blur background
- Mobile: hamburger menu

#### Cart Sidebar
- Slide from right
- Backdrop overlay
- Item list with quantity controls
- Subtotal calculation
- Checkout button

#### Search Bar
- Expandable on focus
- AI-powered suggestions
- Recent searches
- Autocomplete dropdown

### Animations
- Page transitions: fade + slide (300ms)
- Card hover: scale + shadow (200ms)
- Button press: scale(0.98) (100ms)
- Modal: fade + scale (250ms)
- Skeleton loading: shimmer
- Stagger reveals for grid items (50ms delay each)

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  image_url VARCHAR(500),
  stock INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INT DEFAULT 0,
  isfeatured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cart Items Table
```sql
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);
```

### Wishlist Table
```sql
CREATE TABLE wishlist (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  product_id INT REFERENCES products(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List all products (with filters)
- `GET /api/products/{id}` - Get product details
- `GET /api/products/featured` - Get featured products
- `GET /api/products/new` - Get new arrivals
- `GET /api/products/search` - Search products
- `GET /api/products/recommendations` - AI recommendations

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/{id}` - Update quantity
- `DELETE /api/cart/{id}` - Remove from cart
- `DELETE /api/cart` - Clear cart

### Wishlist
- `GET /api/wishlist` - Get wishlist items
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/{id}` - Remove from wishlist

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `POST /api/orders/{id}/cancel` - Cancel order

### Admin
- `POST /api/admin/products` - Add product
- `PUT /api/admin/products/{id}` - Update product
- `DELETE /api/admin/products/{id}` - Delete product

---

## Page Structure

### Pages
1. **Home Page** (`/`)
   - Hero carousel
   - Featured products
   - New arrivals
   - AI recommendations
   - Special offers

2. **Products Page** (`/products`)
   - Category filter
   - Sort options
   - Product grid
   - Pagination

3. **Product Details** (`/product/:id`)
   - Image gallery
   - Product info
   - Add to cart
   - Reviews

4. **Cart Page** (`/cart`)
   - Cart items
   - Quantity controls
   - Checkout

5. **Checkout Page** (`/checkout`)
   - Shipping info
   - Payment
   - Order summary

6. **Orders Page** (`/orders`)
   - Order history
   - Order details

7. **Wishlist Page** (`/wishlist`)
   - Saved items

8. **Auth Pages** (`/login`, `/register`)
   - Login form
   - Register form

9. **Admin Dashboard** (`/admin`)
   - Product management
   - Order management

---

## Product Categories

### Furniture
- Sofas
- Tables
- Chairs
- Beds
- Storage

### Electronics
- Smartphones
- Laptops
- Audio
- Cameras
- Accessories

### Fashion
- Men's
- Women's
- Accessories
- Footwear

---

## AI Features

### Product Recommendations
- Collaborative filtering based on user behavior
- Similar products algorithm
- Trending products
- Recently viewed

### Smart Search
- Keyword suggestions
- Auto-complete
- Search filters
- Related searches

---

## Security Requirements

### Authentication
- JWT tokens with 24h expiry
- Refresh tokens for session extension
- Password minimum 8 characters
- Bcrypt hashing

### API Security
- Rate limiting
- Input validation (Pydantic)
- SQL injection prevention (ORM)
- CORS configuration

---

## Deployment

### Frontend (Vercel)
- Build: npm run build
- Output: dist/
- Framework: Vite

### Backend (Render/Railway)
- Runtime: Python 3.11
- Start command: uvicorn main:app
- Port: 8000

### Database (PostgreSQL)
- Provider: Neon/Railway/Supabase
- Connection pool required

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL database

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configure DATABASE_URL
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Configure VITE_API_URL
npm run dev
```

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```