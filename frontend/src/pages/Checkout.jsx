import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Lock, MapPin, Truck, DollarSign, Tag, Check, AlertCircle, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Checkout() {
  const [loading, setLoading] = useState(false)
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false })
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  
  const { items, getTotal, clearCart } = useCart()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadRazorpay()
  }, [])

  useEffect(() => {
    console.log('Auth state:', { user, authLoading })
    if (user && user.id) {
      console.log('User ID:', user.id)
      fetchAddresses()
    }
  }, [user, authLoading])

  async function fetchAddresses() {
    try {
      setAddressesLoading(true)
      console.log('Fetching addresses...')
      const res = await api.get('/api/addresses')
      console.log('Addresses response:', res.data)
      setAddresses(res.data)
      const defaultAddr = res.data.find(a => a.is_default)
      if (defaultAddr) setSelectedAddress(defaultAddr.id)
      else if (res.data.length > 0) setSelectedAddress(res.data[0].id)
    } catch (err) {
      console.error('Fetch addresses error:', err)
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        navigate('/login')
      }
    } finally {
      setAddressesLoading(false)
    }
  }

  function loadRazorpay() {
    if (window.Razorpay) { setRazorpayLoaded(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => setRazorpayLoaded(true)
    document.body.appendChild(script)
  }

  async function handleAddAddress(e) {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      console.log('Token exists:', !!token)
      console.log('Sending address:', newAddress)
      
      if (!newAddress.name?.trim()) { alert('Please enter name'); return }
      if (!newAddress.phone?.trim()) { alert('Please enter phone'); return }
      if (!newAddress.address_line1?.trim()) { alert('Please enter address'); return }
      if (!newAddress.city?.trim()) { alert('Please enter city'); return }
      if (!newAddress.state?.trim()) { alert('Please enter state'); return }
      if (!newAddress.pincode?.trim()) { alert('Please enter pincode'); return }
      
      console.log('Validation passed, sending...')
      const res = await api.post('/api/addresses', newAddress)
      console.log('Address saved:', res.data)
      setAddresses([...addresses, res.data])
      setSelectedAddress(res.data.id)
      setShowAddressForm(false)
      setNewAddress({ name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false })
      alert('Address saved successfully!')
      // Refresh addresses
      setTimeout(() => fetchAddresses(), 300)
    } catch (err) { 
      console.error('Address save error:', err)
      console.error('Error response:', err.response)
      console.error('Error status:', err.response?.status)
      const msg = err.response?.data?.detail || err.message || 'Failed to save address'
      alert('Error: ' + msg)
    }
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await api.get(`/api/coupons/validate/${couponCode}?order_amount=${getTotal()}`)
      setAppliedCoupon(res.data)
    } catch (err) {
      setCouponError(err.response?.data?.detail || 'Invalid coupon')
      setAppliedCoupon(null)
    } finally { setCouponLoading(false) }
  }

  function calculateDiscount() {
    if (!appliedCoupon) return 0
    if (appliedCoupon.discount_type === 'percentage') {
      return (getTotal() * appliedCoupon.discount_value) / 100
    }
    return appliedCoupon.discount_value
  }

  function getFinalTotal() {
    return Math.max(0, getTotal() - calculateDiscount())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    if (items.length === 0) return
    if (!selectedAddress) { alert('Please select an address'); return }
    
    const address = addresses.find(a => a.id === selectedAddress)
    const shippingAddress = `${address.name}, ${address.phone}\n${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}\n${address.city}, ${address.state} - ${address.pincode}`
    
    if (paymentMethod === 'card' && razorpayLoaded) {
      await handleRazorpayPayment(shippingAddress)
    } else {
      await placeOrder(shippingAddress)
    }
  }

  async function handleRazorpayPayment(shippingAddress) {
    setLoading(true)
    try {
      const orderRes2 = await api.post('/api/orders', { 
        payment_method: 'card', 
        shipping_address: shippingAddress 
      })
      const orderId = orderRes2.data.id
      
      const orderRes = await api.post('/api/payments/create-order', { order_id: orderId, payment_method: 'card' })
      const { razorpay_order_id, amount, key_id } = orderRes.data
      
      const rzData = {
        key: key_id,
        amount: amount * 100,
        currency: 'INR',
        name: 'LuxeMart',
        description: 'Order Payment',
        order_id: razorpay_order_id,
        handler: async function(response) {
          try {
            await api.post('/api/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              order_id: orderId
            })
            setPaymentSuccess(true)
            await clearCart()
            setTimeout(() => navigate('/orders'), 2000)
          } catch (err) { console.error(err); alert('Payment verification failed') }
        },
        modal: { ondismiss: () => setLoading(false) }
      }
      
      const rzp = new window.Razorpay(rzData)
      rzp.open()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || 'Payment initialization failed')
    } finally { setLoading(false) }
  }

  async function placeOrder(shippingAddress) {
    setLoading(true)
    try {
      await api.post('/api/orders', { 
        payment_method: paymentMethod, 
        shipping_address: shippingAddress 
      })
      await clearCart()
      navigate('/orders')
    } catch (error) {
      console.error('Order failed:', error)
      alert(error.response?.data?.detail || 'Order failed')
    } finally { setLoading(false) }
  }

  if (authLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><div className="skeleton h-96 rounded-2xl" /></div>
  }

  if (!user) {
    navigate('/login')
    return null
  }

  if (items.length === 0 && !paymentSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-neutral-300" />
        <h2 className="text-xl font-bold mt-4">Your cart is empty</h2>
        <button onClick={() => navigate('/products')} className="btn btn-primary mt-6">Continue Shopping</button>
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-10 h-10 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-bold mt-6">Payment Successful!</h2>
        <p className="text-neutral-500 mt-2">Redirecting to orders...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-heading font-bold">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Shipping Address
              </h2>
              <button type="button" onClick={() => setShowAddressForm(!showAddressForm)} className="text-sm text-primary-500 hover:underline">
                {showAddressForm ? 'Cancel' : '+ Add New'}
              </button>
            </div>
            
            <AnimatePresence>
              {showAddressForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl space-y-3 overflow-hidden">
                  <form onSubmit={handleAddAddress}>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Full Name" value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} className="input" required />
                      <input type="tel" placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="input" required />
                    </div>
                    <input type="text" placeholder="Address Line 1" value={newAddress.address_line1} onChange={e => setNewAddress({...newAddress, address_line1: e.target.value})} className="input" required />
                    <input type="text" placeholder="Address Line 2 (Optional)" value={newAddress.address_line2} onChange={e => setNewAddress({...newAddress, address_line2: e.target.value})} className="input" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="City" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="input" required />
                      <input type="text" placeholder="State" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="input" required />
                      <input type="text" placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} className="input" required />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newAddress.is_default} onChange={e => setNewAddress({...newAddress, is_default: e.target.checked})} />
                      Set as default address
                    </label>
                    <button type="submit" className="btn btn-primary w-full">Save Address</button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            
            {addressesLoading ? (
              <div className="text-center py-4 text-neutral-500">Loading addresses...</div>
            ) : addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <label key={addr.id} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${selectedAddress === addr.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700'}`}>
                    <input type="radio" name="address" checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} className="mt-1" />
                    <div>
                      <p className="font-medium">{addr.name} <span className="text-neutral-500 text-sm">- {addr.phone}</span></p>
                      <p className="text-sm text-neutral-500 mt-1">{addr.address_line1}{addr.address_line2 && ', ' + addr.address_line2}, {addr.city}, {addr.state} - {addr.pincode}</p>
                      {addr.is_default && <span className="text-xs text-primary-500">Default</span>}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">No addresses saved. Please add an address above.</p>
            )}
          </div>
          
          <div className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" /> Payment Method
            </h2>
            <div className="space-y-3">
              {[
                { id: 'cod', name: 'Cash on Delivery', icon: DollarSign, desc: 'Pay when you receive' },
                { id: 'upi', name: 'UPI', icon: Tag, desc: 'Pay using UPI' },
                { id: 'card', name: 'Card', icon: CreditCard, desc: 'Credit/Debit Card via Razorpay' },
              ].map(method => (
                <label key={method.id} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === method.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700'}`}>
                  <input type="radio" name="payment" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} />
                  <method.icon className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-xs text-neutral-500">{method.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-neutral-500 text-sm">
              <Lock className="w-4 h-4" />Your payment is secured
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm sticky top-24">
            <h2 className="font-heading font-bold text-lg">Order Summary</h2>
            
            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <div className="flex gap-3">
                <input type="text" placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="input flex-1" />
                <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="btn btn-secondary">
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                  <span className="text-green-600 flex items-center gap-1"><Tag className="w-4 h-4" />{appliedCoupon.code}</span>
                  <button type="button" onClick={() => {setAppliedCoupon(null); setCouponCode('')}} className="text-red-500">Remove</button>
                </div>
              )}
            </div>
            
            <div className="mt-4 space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-neutral-500">{item.product?.name} x{item.quantity}</span>
                  <span>Rs. {((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
              <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>Rs. {getTotal().toFixed(2)}</span></div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-500">
                  <span>Discount</span><span>- Rs. {calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span className="text-green-500 font-medium">Free</span></div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-heading font-bold">Total</span>
                <span className="font-heading font-bold text-xl text-primary-600">Rs. {getFinalTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <button type="button" onClick={handleSubmit} disabled={loading || !selectedAddress} className="btn btn-primary w-full mt-6 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {!selectedAddress ? 'Select Address' : loading ? 'Processing...' : `Place Order - Rs. ${getFinalTotal().toFixed(2)}`}
            </button>
            {addresses.length > 0 && !selectedAddress && (
              <p className="text-red-500 text-sm text-center mt-2">Please select a shipping address</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}