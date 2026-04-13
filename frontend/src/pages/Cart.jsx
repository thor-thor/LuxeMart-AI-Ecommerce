import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, updateQuantity, removeFromCart, getTotal, loading } = useCart()

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton h-96 rounded-2xl" /></div>
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-24 h-24 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <ShoppingBag className="w-12 h-12 text-neutral-300" />
        </div>
        <h2 className="text-2xl font-heading font-bold mt-6">Your cart is empty</h2>
        <p className="text-neutral-500 mt-2">Looks like you haven't added anything yet.</p>
        <Link to="/products" className="btn btn-primary mt-8">Start Shopping</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Shopping Cart</h1>
          <p className="text-neutral-500 mt-1">{items.length} {items.length === 1 ? 'item' : 'items'} in your cart</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="flex gap-4 p-4 bg-white dark:bg-dark-card rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <Link to={`/product/${item.product_id}`} className="w-28 h-28 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                  <img src={item.product?.image_url || '/placeholder.jpg'} alt={item.product?.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product_id}`} className="font-medium hover:text-primary-500 line-clamp-1">{item.product?.name}</Link>
                  <p className="text-primary-600 font-medium mt-1">Rs. {item.product?.price}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50" disabled={item.quantity <= 1}><Minus className="w-4 h-4" /></button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"><Plus className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-lg">Rs. {((item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1">
          <div className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm sticky top-24">
            <h2 className="font-heading font-bold text-lg">Order Summary</h2>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="font-medium">Rs. {getTotal()}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span className="text-green-500 font-medium">Free</span></div>
              <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-heading font-bold">Total</span>
                <span className="font-heading font-bold text-xl text-primary-600">Rs. {getTotal()}</span>
              </div>
            </div>
            <Link to="/checkout" className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2">
              Checkout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}