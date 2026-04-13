import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Heart, User, Search, Menu, X, Moon, Sun, LogOut, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, logout } = useAuth()
  const { getItemCount } = useCart()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const cartCount = getItemCount()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery) {
      navigate(`/products?search=${searchQuery}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const categories = [
    { name: 'Furniture', path: '/products/furnitures' },
    { name: 'Electronics', path: '/products/electronics' },
    { name: 'Fashion', path: '/products/fashions' },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'backdrop-blur-xl bg-white/70 dark:bg-black/70 shadow-sm border-b border-neutral-200/50 dark:border-neutral-800/50' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary-500 dark:bg-accent-500 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              <span className="text-white font-heading font-bold text-2xl tracking-tighter">L</span>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight hidden sm:block">LuxeMart</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {categories.map((cat) => (
              <Link key={cat.name} to={cat.path} className="text-sm uppercase tracking-widest text-neutral-600 hover:text-black transition-colors dark:text-neutral-400 dark:hover:text-white relative group">
                {cat.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <AnimatePresence>
                {searchOpen ? (
                  <motion.form initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }} onSubmit={handleSearch} className="overflow-hidden">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card focus:outline-none focus:border-primary-500"
                      autoFocus
                      onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                    />
                  </motion.form>
                ) : null}
              </AnimatePresence>
              {!searchOpen && (
                <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <Link to="/wishlist" className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <Heart className="w-5 h-5" />
            </Link>

            <Link to="/cart" className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-500 text-white text-xs flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative group">
                <button className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-neutral-100 dark:border-neutral-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-neutral-500">{user.email}</p>
                    {user.is_admin && <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs rounded-full">Admin</span>}
                  </div>
                  <Link to="/orders" className="flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <Package className="w-4 h-4" />My Orders
                  </Link>
                  {user.is_admin && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-primary-600 dark:text-primary-400">
                      <Package className="w-4 h-4" />Admin Panel
                    </Link>
                  )}
                  <button onClick={logout} className="flex items-center gap-2 px-4 py-2.5 w-full text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500">
                    <LogOut className="w-4 h-4" />Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">Sign In</Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors md:hidden">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden pb-4">
              <nav className="flex flex-col gap-2">
                {categories.map((cat) => (
                  <Link key={cat.name} to={cat.path} className="px-4 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}