import { Link } from 'react-router-dom'
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-neutral-100 dark:bg-dark-surface mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="font-heading font-bold text-xl">LuxeMart</span>
            </Link>
            <p className="text-neutral-500 text-sm">Your premium destination for furniture, electronics, and fashion.</p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="p-2 rounded-full bg-neutral-200 hover:bg-primary-500 hover:text-white transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="p-2 rounded-full bg-neutral-200 hover:bg-primary-500 hover:text-white transition-colors"><Twitter className="w-4 h-4" /></a>
              <a href="#" className="p-2 rounded-full bg-neutral-200 hover:bg-primary-500 hover:text-white transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="p-2 rounded-full bg-neutral-200 hover:bg-primary-500 hover:text-white transition-colors"><Linkedin className="w-4 h-4" /></a>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4">Shop</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/products/furnitures" className="text-neutral-500 hover:text-primary-500 transition-colors">Furniture</Link>
              <Link to="/products/electronics" className="text-neutral-500 hover:text-primary-500 transition-colors">Electronics</Link>
              <Link to="/products/fashions" className="text-neutral-500 hover:text-primary-500 transition-colors">Fashion</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4">Support</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/orders" className="text-neutral-500 hover:text-primary-500 transition-colors">My Orders</Link>
              <Link to="/wishlist" className="text-neutral-500 hover:text-primary-500 transition-colors">Wishlist</Link>
              <Link to="/cart" className="text-neutral-500 hover:text-primary-500 transition-colors">Cart</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-4">Contact</h4>
            <div className="flex flex-col gap-2 text-neutral-500">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>123 Commerce St</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>+1 555-123-4567</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>support@luxemart.com</span></div>
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-200 mt-8 pt-8 flex justify-between">
          <p className="text-neutral-500 text-sm">© 2026 LuxeMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}