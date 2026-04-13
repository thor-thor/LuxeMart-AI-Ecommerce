-- LuxeMart Database Schema
-- PostgreSQL

-- Create Database
CREATE DATABASE luxemart;

-- Connect to the database
\c luxemart

-- Users Table
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

-- Products Table
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
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart Items Table
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Wishlist Table
CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    product_id INT NOT NULL REFERENCES products(id),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Create Indexes for Performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_new ON products(is_new);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_wishlist_user ON wishlist(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- Insert Sample Admin User (password: admin123)
INSERT INTO users (email, username, password_hash, full_name, is_admin) 
VALUES ('admin@luxemart.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqKxLvQjGi', 'Admin User', TRUE);

-- Insert Sample Products
-- Furniture
INSERT INTO products (name, description, price, original_price, category, image_url, stock, rating, review_count, is_featured, is_new) VALUES
('Modern Leather Sofa', 'Premium quality leather sofa with modern design', 1299.99, 1599.99, 'Furnitures', '/images/furnitures/1.webp', 10, 4.5, 23, TRUE, FALSE),
('Oak Dining Table', 'Solid oak dining table for 6 persons', 899.99, 1099.99, 'Furnitures', '/images/furnitures/2.webp', 15, 4.8, 45, TRUE, FALSE),
('Ergonomic Office Chair', 'Comfortable ergonomic chair with lumbar support', 449.99, 549.99, 'Furnitures', '/images/furnitures/3.webp', 25, 4.3, 67, FALSE, TRUE),
('Wooden Bookshelf', '5-tier wooden bookshelf with modern finish', 299.99, 399.99, 'Furnitures', '/images/furnitures/4.webp', 30, 4.6, 89, FALSE, FALSE),
('King Size Bed Frame', 'Modern king size bed frame with headboard', 799.99, 999.99, 'Furnitures', '/images/furnitures/5.webp', 12, 4.7, 34, TRUE, FALSE),
('Coffee Table Set', 'Marble top coffee table with 2 side tables', 349.99, 449.99, 'Furnitures', '/images/furnitures/6.webp', 20, 4.4, 56, FALSE, FALSE),
('TV Stand', 'Modern TV stand with storage compartments', 249.99, 299.99, 'Furnitures', '/images/furnitures/7.webp', 18, 4.2, 41, FALSE, TRUE);

-- Electronics
INSERT INTO products (name, description, price, original_price, category, image_url, stock, rating, review_count, is_featured, is_new) VALUES
('Smartphone Pro Max', 'Latest flagship smartphone with advanced camera', 999.99, 1199.99, 'Electronics', '/images/electronics/1.webp', 50, 4.9, 234, TRUE, FALSE),
('Wireless Earbuds', 'Premium wireless earbuds with noise cancellation', 199.99, 249.99, 'Electronics', '/images/electronics/2.webp', 100, 4.7, 156, TRUE, FALSE),
('Smart Watch', 'Fitness tracker with heart rate monitor', 299.99, 349.99, 'Electronics', '/images/electronics/3.webp', 75, 4.5, 89, FALSE, TRUE),
('Laptop 15 inch', 'High-performance laptop for professionals', 1299.99, 1499.99, 'Electronics', '/images/electronics/4.webp', 30, 4.8, 112, TRUE, FALSE),
('Bluetooth Speaker', 'Portable waterproof speaker', 129.99, 159.99, 'Electronics', '/images/electronics/5.webp', 80, 4.4, 67, FALSE, FALSE),
('Gaming Console', 'Next-gen gaming console with 4K support', 499.99, 599.99, 'Electronics', '/images/electronics/6.webp', 25, 4.9, 198, TRUE, FALSE),
('Tablet Pro', 'Professional tablet with stylus support', 699.99, 849.99, 'Electronics', '/images/electronics/7.webp', 40, 4.6, 78, FALSE, TRUE),
('Webcam HD', '1080p webcam for video calls', 79.99, 99.99, 'Electronics', '/images/electronics/8.webp', 60, 4.3, 45, FALSE, FALSE);

-- Fashion
INSERT INTO products (name, description, price, original_price, category, image_url, stock, rating, review_count, is_featured, is_new) VALUES
('Premium Wool Coat', 'Classic wool coat for winter season', 299.99, 399.99, 'Fashions', '/images/fashions/1.webp', 35, 4.8, 56, TRUE, FALSE),
('Designer Handbag', 'Genuine leather designer handbag', 399.99, 499.99, 'Fashions', '/images/fashions/2.webp', 45, 4.9, 89, TRUE, FALSE),
('Running Shoes', 'Lightweight running shoes with cushioning', 149.99, 179.99, 'Fashions', '/images/fashions/3.webp', 100, 4.6, 123, FALSE, TRUE),
('Silk Scarf', '100% pure silk scarf with floral print', 89.99, 109.99, 'Fashions', '/images/fashions/4.webp', 60, 4.5, 34, FALSE, FALSE),
('Men''s Leather Belt', 'Genuine leather belt with silver buckle', 59.99, 79.99, 'Fashions', '/images/fashions/5.webp', 80, 4.4, 67, TRUE, FALSE),
('Sunglasses', 'UV protection polarized sunglasses', 129.99, 159.99, 'Fashions', '/images/fashions/6.webp', 50, 4.7, 45, FALSE, TRUE),
('Cotton T-Shirt Pack', 'Pack of 3 premium cotton t-shirts', 49.99, 69.99, 'Fashions', '/images/fashions/7.webp', 120, 4.3, 156, FALSE, FALSE);

-- Verify Data
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Categories', COUNT(DISTINCT category) FROM products;