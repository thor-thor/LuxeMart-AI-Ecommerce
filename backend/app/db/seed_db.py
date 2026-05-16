"""
Database seeding script — inserts initial data into SQLite DB.
Run:  python -m app.db.seed_db
"""
import os, sqlite3
from passlib.context import CryptContext

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
DB_PATH = os.path.join(BACKEND_DIR, "ecommerce.db")

PRODUCTS = [
    # (name, description, price, original_price, category, image_url, stock, rating, review_count, is_featured, is_new)
    ("Modern Leather Sofa",         "Premium quality leather sofa with modern design",                        1299.99, 1599.99, "Furnitures", "/images/furnitures/1.webp", 10, 4.5, 23,  True,  False),
    ("Oak Dining Table",            "Solid oak dining table for 6 persons",                                    899.99, 1099.99, "Furnitures", "/images/furnitures/2.webp", 15, 4.8, 45,  True,  False),
    ("Ergonomic Office Chair",      "Comfortable ergonomic chair with lumbar support",                         449.99,  549.99, "Furnitures", "/images/furnitures/3.webp", 25, 4.3, 67, False,  True),
    ("Wooden Bookshelf",            "5-tier wooden bookshelf with modern finish",                              299.99,  399.99, "Furnitures", "/images/furnitures/4.webp", 30, 4.6, 89, False, False),
    ("King Size Bed Frame",         "Modern king size bed frame with headboard",                               799.99,  999.99, "Furnitures", "/images/furnitures/5.webp", 12, 4.7, 34,  True, False),
    ("Coffee Table Set",            "Marble top coffee table with 2 side tables",                              349.99,  449.99, "Furnitures", "/images/furnitures/6.webp", 20, 4.4, 56, False, False),
    ("TV Stand",                    "Modern TV stand with storage compartments",                               249.99,  299.99, "Furnitures", "/images/furnitures/7.webp", 18, 4.2, 41, False,  True),
    # Electronics
    ("Smartphone Pro Max",          "Latest flagship smartphone with advanced camera",                         999.99, 1199.99, "Electronics", "/images/electronics/1.webp", 50, 4.9, 234, True, False),
    ("Wireless Earbuds",            "Premium wireless earbuds with noise cancellation",                        199.99,  249.99, "Electronics", "/images/electronics/2.webp",100, 4.7, 156, True, False),
    ("Smart Watch",                 "Fitness tracker with heart rate monitor",                                 299.99,  349.99, "Electronics", "/images/electronics/3.webp", 75, 4.5, 89, False,  True),
    ("Laptop 15 inch",              "High-performance laptop for professionals",                              1299.99, 1499.99, "Electronics", "/images/electronics/4.webp", 30, 4.8, 112, True, False),
    ("Bluetooth Speaker",           "Portable waterproof speaker",                                             129.99,  159.99, "Electronics", "/images/electronics/5.webp", 80, 4.4, 67, False, False),
    ("Gaming Console",              "Next-gen gaming console with 4K support",                                 499.99,  599.99, "Electronics", "/images/electronics/6.webp", 25, 4.9, 198, True, False),
    ("Tablet Pro",                  "Professional tablet with stylus support",                                 699.99,  849.99, "Electronics", "/images/electronics/7.webp", 40, 4.6, 78, False,  True),
    ("Webcam HD",                   "1080p webcam for video calls",                                             79.99,   99.99, "Electronics", "/images/electronics/8.webp", 60, 4.3, 45, False, False),
    # Fashion
    ("Premium Wool Coat",           "Classic wool coat for winter season",                                     299.99,  399.99, "Fashions", "/images/fashions/1.webp", 35, 4.8, 56,  True, False),
    ("Designer Handbag",            "Genuine leather designer handbag",                                        399.99,  499.99, "Fashions", "/images/fashions/2.webp", 45, 4.9, 89,  True, False),
    ("Running Shoes",               "Lightweight running shoes with cushioning",                               149.99,  179.99, "Fashions", "/images/fashions/3.webp",100, 4.6, 123, False,  True),
    ("Silk Scarf",                  "100% pure silk scarf with floral print",                                   89.99,  109.99, "Fashions", "/images/fashions/4.webp", 60, 4.5, 34, False, False),
    ("Men's Leather Belt",          "Genuine leather belt with silver buckle",                                  59.99,   79.99, "Fashions", "/images/fashions/5.webp", 80, 4.4, 67,  True, False),
    ("Sunglasses",                  "UV protection polarized sunglasses",                                      129.99,  159.99, "Fashions", "/images/fashions/6.webp", 50, 4.7, 45, False,  True),
    ("Cotton T-Shirt Pack",         "Pack of 3 premium cotton t-shirts",                                        49.99,   69.99, "Fashions", "/images/fashions/7.webp",120, 4.3, 156, False, False),
]

USERS = [
    # (email, username, plain_password, full_name, phone, is_admin)
    ("rajeshjindam1803@gmail.com", "rajeshjindam1803", "Rajesh-1803", "Rajesh Jindam",    "+919876543210", True ),
    ("admin@luxemart.com",          "admin",            "admin123",    "Admin User",       "+919876543211", True ),
    ("buyer@luxemart.com",          "buyer",            "buyer123",    "Test Buyer",       "+919876543212", False),
]


def main():
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    c = conn.cursor()

    # ── Users ─────────────────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        for email, username, plain, name, phone, is_admin in USERS:
            c.execute(
                "INSERT INTO users (email,username,password_hash,full_name,phone,is_admin) VALUES (?,?,?,?,?,?)",
                (email, username, pwd.hash(plain), name, phone, is_admin),
            )
        print(f"  Inserted {len(USERS)} users")
    else:
        print(f"  Users already exist — skipping")

    # ── Products ───────────────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM products")
    if c.fetchone()[0] == 0:
        c.executemany(
            "INSERT INTO products (name,description,price,original_price,category,image_url,stock,rating,review_count,is_featured,is_new) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            PRODUCTS,
        )
        print(f"  Inserted {len(PRODUCTS)} products")
    else:
        print(f"  Products already exist — skipping")

    conn.commit()

    for row in c.execute("SELECT id, username, email, is_admin FROM users"):
        role = "admin" if row[3] else "user"
        print(f"  USER  id={row[0]}  '{row[1]}'  {row[2]}  ({role})")
    print(f"  Total products: {c.execute('SELECT COUNT(*) FROM products').fetchone()[0]}")

    conn.close()
    print(f"\n[seed] Done  ->  {DB_PATH}")


if __name__ == "__main__":
    main()
