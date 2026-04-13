import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, ChevronRight, X, AlertTriangle, Check, XCircle, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const statusColors = { 
  pending: 'bg-yellow-500', 
  confirmed: 'bg-blue-500', 
  processing: 'bg-blue-500', 
  shipped: 'bg-purple-500', 
  out_for_delivery: 'bg-indigo-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500'
}

const statusIcons = {
  pending: Clock,
  confirmed: Check,
  processing: Package,
  shipped: Package,
  out_for_delivery: Package,
  delivered: Check,
  cancelled: XCircle
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const { user, loading: authLoading } = useAuth()

  useEffect(() => { 
    if (!authLoading && user) fetchOrders() 
  }, [user, authLoading])

  async function fetchOrders() {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await api.get('/api/orders')
      setOrders(response.data || [])
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setCancelling(orderId)
    try {
      await api.put(`/api/orders/${orderId}/cancel`)
      await fetchOrders()
      setExpandedOrder(null)
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to cancel order')
    } finally {
      setCancelling(null)
    }
  }

  function canCancel(status) {
    return ['pending', 'confirmed', 'processing'].includes(status)
  }

  if (authLoading) return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton h-96 rounded-2xl" /></div>

  if (!user) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <p className="text-neutral-500">Please <Link to="/login" className="text-primary-500">sign in</Link> to view your orders.</p>
    </div>
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton h-96 rounded-2xl" /></div>

  if (orders.length === 0) return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
    <Package className="w-16 h-16 mx-auto text-neutral-300" />
    <h2 className="text-2xl font-heading font-bold mt-6">No orders yet</h2>
    <p className="text-neutral-500 mt-2">You haven't placed any orders yet.</p>
    <Link to="/products" className="btn btn-primary mt-8">Start Shopping</Link>
  </div>

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-2xl md:text-3xl font-heading font-bold">My Orders</h1>
    <div className="mt-8 space-y-4">
      {orders.map((order) => (
        <motion.div key={order.id} className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm">
          <div 
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-medium">{order.order_number}</p>
                {canCancel(order.status) && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">Can Cancel</span>
                )}
              </div>
              <p className="text-sm text-neutral-500">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm ${statusColors[order.status] || 'bg-neutral-500'}`}>
                {(() => {
                  const Icon = statusIcons[order.status] || Package
                  return <Icon className="w-3.5 h-3.5" />
                })()}
                {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
              </div>
              
              <div className="text-right">
                <p className="font-heading font-bold">Rs. {parseFloat(order.total_amount).toFixed(2)}</p>
              </div>
              
              <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${expandedOrder === order.id ? 'rotate-90' : ''}`} />
            </div>
          </div>
          
          <AnimatePresence>
            {expandedOrder === order.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="font-medium mb-4">Order Items</h3>
                <div className="space-y-3">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <img src={item.product?.image_url || '/placeholder.jpg'} alt={item.product?.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-neutral-500">Qty: {item.quantity} x Rs. {parseFloat(item.price).toFixed(2)}</p>
                      </div>
                      <p className="font-medium">Rs. {(item.quantity * parseFloat(item.price)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Payment Method</p>
                    <p className="font-medium">{order.payment_method?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Payment Status</p>
                    <p className={`font-medium ${order.payment_status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                      {order.payment_status?.charAt(0).toUpperCase() + order.payment_status?.slice(1)}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <p className="text-sm text-neutral-500 mb-1">Shipping Address</p>
                  <p className="text-sm whitespace-pre-line">{order.shipping_address}</p>
                </div>
                
                {canCancel(order.status) && (
                  <div className="mt-6 flex items-center gap-4">
                    <button 
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancelling === order.id}
                      className="px-4 py-2 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {cancelling === order.id ? (
                        <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Cancel Order
                    </button>
                    <span className="text-sm text-neutral-500 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Can cancel before shipment
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  </div>
}