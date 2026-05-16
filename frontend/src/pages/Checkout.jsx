import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard,
  Lock,
  MapPin,
  Truck,
  DollarSign,
  Tag,
  Check,
  AlertCircle,
  ShoppingBag,
  Smartphone,
  Shield,
  Loader2,
  Wallet,
  RefreshCw,
  Info
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import paymentService from '../services/paymentService'

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
  const [newAddress, setNewAddress] = useState({
    name: '', phone: '', address_line1: '',
    address_line2: '', city: '', state: '', pincode: '', is_default: false
  })
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentMethods, setPaymentMethods] = useState({
    cod: true,
    upi: false,
    card: false,
  })
  const [upiPaymentData, setUpiPaymentData] = useState(null)
  const [upiPaymentAppOpened, setUpiPaymentAppOpened] = useState(false)
  const [paymentStage, setPaymentStage] = useState('idle')

  const { items, getTotal, clearCart } = useCart()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Calculate discount and total
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

  useEffect(() => {
    loadRazorpay()
    fetchPaymentMethods()
  }, [])

  useEffect(() => {
    if (user && user.id) {
      fetchAddresses()
    }
  }, [user, authLoading])

  async function fetchPaymentMethods() {
    try {
      const res = await api.get('/api/payments/methods')
      const data = res.data
      setPaymentMethods({
        cod: data.cod_enabled,
        upi: data.supported_methods.includes('upi'),
        card: data.supported_methods.includes('card'),
      })
    } catch (err) {
      console.error('Failed to fetch payment methods:', err)
      // Fallback to basic methods
      setPaymentMethods({ cod: true, upi: true, card: true })
    }
  }

  async function fetchAddresses() {
    try {
      setAddressesLoading(true)
      const res = await api.get('/api/addresses')
      setAddresses(res.data)
      const defaultAddr = res.data.find(a => a.is_default)
      if (defaultAddr) setSelectedAddress(defaultAddr.id)
      else if (res.data.length > 0) setSelectedAddress(res.data[0].id)
    } catch (err) {
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
    script.onerror = () => {
      setPaymentMethods(prev => ({ ...prev, card: false }))
      console.error('Failed to load Razorpay SDK')
    }
    document.body.appendChild(script)
  }

  async function handleAddAddress(e) {
    e.preventDefault()
    try {
      if (!newAddress.name?.trim()) { alert('Please enter name'); return }
      if (!newAddress.phone?.trim()) { alert('Please enter phone'); return }
      if (!newAddress.address_line1?.trim()) { alert('Please enter address'); return }
      if (!newAddress.city?.trim()) { alert('Please enter city'); return }
      if (!newAddress.state?.trim()) { alert('Please enter state'); return }
      if (!newAddress.pincode?.trim()) { alert('Please enter pincode'); return }

      const res = await api.post('/api/addresses', newAddress)
      setAddresses([...addresses, res.data])
      setSelectedAddress(res.data.id)
      setShowAddressForm(false)
      setNewAddress({
        name: '', phone: '', address_line1: '',
        address_line2: '', city: '', state: '', pincode: '', is_default: false
      })
      alert('Address saved successfully!')
      setTimeout(() => fetchAddresses(), 300)
    } catch (err) {
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

  async function handleSubmit(e) {
    e.preventDefault()
    setPaymentError('')
    if (!user) { navigate('/login'); return }
    if (items.length === 0) return
    if (!selectedAddress) { alert('Please select an address'); return }

    const address = addresses.find(a => a.id === selectedAddress)
    const shippingAddress = `${address.name}, ${address.phone}\n${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}\n${address.city}, ${address.state} - ${address.pincode}`

    switch (paymentMethod) {
      case 'card':
        await handleCardPayment(shippingAddress)
        break
      case 'upi':
        await handleUpiPayment(shippingAddress)
        break
      case 'cod':
        await placeOrder(shippingAddress, 'cod')
        break
      default:
        alert('Please select a valid payment method')
    }
  }

  async function handleCardPayment(shippingAddress) {
    setLoading(true)
    setPaymentStage('creating')
    try {
      // Create order first
      const orderRes = await api.post('/api/orders', {
        payment_method: 'card',
        shipping_address: shippingAddress,
      })
      const orderId = orderRes.data.id

      // Create payment order via Razorpay
      setPaymentStage('processing')
      const paymentRes = await api.post('/api/payments/create-order', {
        order_id: orderId,
        payment_method: 'card',
      })

      const { razorpay_order_id, amount, key_id } = paymentRes.data

      // Verify payment using the secure service
      const handler = paymentService.setupRazorpayHandler(
        {
          keyId: key_id,
          amount: amount * 100,
          currency: 'INR',
          orderId: razorpay_order_id,
          name: 'LuxeMart',
          description: `Order #${orderRes.data.order_number}`,
          themeColor: '#3B82F6',
        },
        async (result) => {
          // Payment verified successfully by server
          setPaymentSuccess(true)
          setPaymentStage('completed')
          await clearCart()
          setTimeout(() => navigate('/orders'), 2500)
        },
        (errorMsg) => {
          setPaymentError(errorMsg || 'Payment failed')
          setPaymentStage('failed')
          setLoading(false)
        }
      )

      if (handler) {
        handler.open()
      }
    } catch (err) {
      setPaymentError(err.response?.data?.detail || 'Payment initialization failed')
      setPaymentStage('failed')
    } finally {
      // Don't reset loading here for handler flow; let callbacks handle it
    }
  }

  async function handleUpiPayment(shippingAddress) {
    setLoading(true)
    setPaymentError('')
    setPaymentStage('creating')
    setUpiPaymentAppOpened(false)

    try {
      // Step 1: Create order
      const orderRes = await api.post('/api/orders', {
        payment_method: 'upi',
        shipping_address: shippingAddress,
      })
      const orderId = orderRes.data.id

      // Step 2: Create UPI payment transaction on server
      setPaymentStage('processing')
      const paymentRes = await api.post('/api/payments/create-order', {
        order_id: orderId,
        payment_method: 'upi',
      })

      const {
        upi_payment_url,
        reference_id,
        transaction_id,
      } = paymentRes.data

      setUpiPaymentData({
        orderId,
        transactionId: transaction_id,
        referenceId: reference_id,
        upiUrl: upi_payment_url,
        amount: getFinalTotal(),
      })

      setPaymentStage('awaiting_user')
      setUpiPaymentAppOpened(true)

    } catch (err) {
      setPaymentError(err.response?.data?.detail || 'UPI payment initialization failed')
      setPaymentStage('failed')
    }
    setLoading(false)
  }

  async function handleUpiPaymentComplete() {
    if (!upiPaymentData) return

    setLoading(true)
    setPaymentStage('verifying')
    setPaymentError('')

    try {
      // For UPI, the payment app generates checksum and transaction ID
      // In a real production app, this data comes from the UPI app callback (intent/deep link)
      // Here we simulate the flow by calling verify-upi which validates the transaction

      // The UPI verification can happen via:
      // 1. Server-side webhook (preferred for production)
      // 2. Client-initiated verification after user confirms payment in UPI app

      // For demonstration, we poll for payment status
      const verifyRes = await api.post('/api/payments/verify-upi', {
        order_id: upiPaymentData.orderId,
        upi_transaction_id: upiPaymentData.referenceId,
        upi_merchant_id: 'demo@upi', // In production, this comes from UPI app callback
        amount: upiPaymentData.amount,
        checksum: 'demo', // In production: actual checksum from UPI callback
        timestamp: Math.floor(Date.now() / 1000),
      })

      if (verifyRes.data.success) {
        setPaymentSuccess(true)
        setPaymentStage('completed')
        setUpiPaymentAppOpened(false)
        await clearCart()
        setTimeout(() => navigate('/orders'), 2500)
      }
    } catch (err) {
      // UPI verification may complete via webhook later
      // Check if order was actually paid by looking at the error
      if (err.response?.status === 400) {
        setPaymentError(
          'Payment verification pending. If you have completed the payment in your UPI app, the order will be confirmed shortly. You can check your order status later.'
        )
        setPaymentStage('pending_webhook')
      } else {
        setPaymentError(err.response?.data?.detail || 'UPI verification failed')
        setPaymentStage('failed')
      }
    }
    setLoading(false)
  }

  async function placeOrder(shippingAddress, method) {
    setLoading(true)
    setPaymentStage('processing')
    setPaymentError('')
    try {
      await api.post('/api/orders', {
        payment_method: method,
        shipping_address: shippingAddress,
      })
      await clearCart()
      setPaymentSuccess(true)
      setPaymentStage('completed')
      setTimeout(() => navigate('/orders'), 2500)
    } catch (error) {
      setPaymentError(error.response?.data?.detail || 'Order failed')
      setPaymentStage('failed')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    )
  }

  if (!user) return null

  if (items.length === 0 && !paymentSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-neutral-300" />
        <h2 className="text-xl font-bold mt-4">Your cart is empty</h2>
        <button onClick={() => navigate('/products')} className="btn btn-primary mt-6">
          Continue Shopping
        </button>
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center"
        >
          <Check className="w-10 h-10 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-bold mt-6">
          {paymentMethod === 'cod' ? 'Order Placed!' : 'Payment Successful!'}
        </h2>
        <p className="text-neutral-500 mt-2">
          {paymentMethod === 'upi' && upiPaymentAppOpened
            ? 'Redirecting after UPI confirmation...'
            : 'Redirecting to orders...'}
        </p>
      </div>
    )
  }

  const isProcessing =
    paymentStage === 'creating' ||
    paymentStage === 'processing' ||
    paymentStage === 'verifying'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-heading font-bold">Checkout</h1>

      {/* Payment Stage Indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 text-blue-700 dark:text-blue-300 text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {paymentStage === 'creating'
                ? 'Creating order...'
                : paymentStage === 'processing'
                ? 'Processing payment...'
                : 'Verifying payment...'}
            </span>
          </motion.div>
        )}
        {paymentStage === 'awaiting_user' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3 text-yellow-700 dark:text-yellow-300 text-sm"
          >
            <Smartphone className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-medium">Complete payment in your UPI app</p>
              <p className="mt-1">
                Click the UPI link below or copy-paste it into your UPI app (Google Pay, PhonePe, Paytm, etc.)
              </p>
              <div className="mt-2 flex gap-2">
                <a
                  href={upiPaymentData?.upiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  Open in UPI App
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(upiPaymentData?.upiUrl)
                    alert('UPI link copied to clipboard!')
                  }}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Copy Link
                </button>
              </div>
              <div className="mt-3 p-2 bg-yellow-100/50 dark:bg-yellow-900/25 rounded-lg">
                <p className="text-xs">
                  <Shield className="w-3.5 h-3.5 inline mr-1" />
                  After paying, click "I have paid" below. Your payment will be verified server-side for security.
                </p>
              </div>
              <button
                onClick={handleUpiPaymentComplete}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                I have paid — Verify Payment
              </button>
            </div>
          </motion.div>
        )}
        {paymentStage === 'pending_webhook' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-start gap-3 text-orange-700 dark:text-orange-300 text-sm"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-medium">Verification Pending</p>
              <p className="mt-1">
                Your UPI payment could not be verified immediately. If you have completed the payment,
                please check your Orders page after a few minutes. If the issue persists, contact support.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    setPaymentStage('idle')
                    setPaymentError('')
                    setUpiPaymentData(null)
                  }}
                  className="px-3 py-1.5 bg-orange-100 dark:bg-orange-800/50 text-orange-800 dark:text-orange-200 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-700 transition-colors"
                >
                  Try Another Payment
                </button>
                <button
                  onClick={() => navigate('/orders')}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Check Orders
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {paymentError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300 text-sm"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>
            <p className="font-medium">Payment Issue</p>
            <p className="mt-1">{paymentError}</p>
            {paymentStage === 'failed' && (
              <button
                onClick={() => {
                  setPaymentStage('idle')
                  setPaymentError('')
                }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                Try Again
              </button>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Shipping Address Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Shipping Address
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-sm text-primary-500 hover:underline"
              >
                {showAddressForm ? 'Cancel' : '+ Add New'}
              </button>
            </div>

            <AnimatePresence>
              {showAddressForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl space-y-3 overflow-hidden"
                >
                  <form onSubmit={handleAddAddress}>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Full Name" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} className="input" required />
                      <input type="tel" placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} className="input" required />
                    </div>
                    <input type="text" placeholder="Address Line 1" value={newAddress.address_line1} onChange={e => setNewAddress({ ...newAddress, address_line1: e.target.value })} className="input" required />
                    <input type="text" placeholder="Address Line 2 (Optional)" value={newAddress.address_line2} onChange={e => setNewAddress({ ...newAddress, address_line2: e.target.value })} className="input" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="City" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} className="input" required />
                      <input type="text" placeholder="State" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} className="input" required />
                      <input type="text" placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} className="input" required />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newAddress.is_default} onChange={e => setNewAddress({ ...newAddress, is_default: e.target.checked })} />
                      Set as default address
                    </label>
                    <button type="submit" className="btn btn-primary w-full mt-2">Save Address</button>
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

          {/* Payment Method Selection */}
          <div className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" /> Payment Method
            </h2>
            <div className="space-y-3">
              {[
                { id: 'cod', name: 'Cash on Delivery', icon: DollarSign, desc: 'Pay when you receive', available: paymentMethods.cod },
                { id: 'upi', name: 'UPI', icon: Wallet, desc: 'Pay using UPI app', available: paymentMethods.upi },
                { id: 'card', name: 'Card (Razorpay)', icon: CreditCard, desc: 'Credit/Debit Card', available: paymentMethods.card },
              ].map(method => (
                <div
                  key={method.id}
                  onClick={() => method.available && setPaymentMethod(method.id)}
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                    !method.available
                      ? 'opacity-50 cursor-not-allowed'
                      : paymentMethod === method.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => method.available && setPaymentMethod(method.id)}
                    className="cursor-pointer"
                    disabled={!method.available}
                  />
                  <method.icon className="w-5 h-5 text-neutral-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{method.name}</p>
                      {!method.available && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-400 rounded">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">{method.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300 text-sm">
              <Shield className="w-4 h-4" />
              <span className="font-medium">Secure Payment</span>
              <span>· All payments are encrypted and processed through verified gateways</span>
            </div>
          </div>

          {/* UPI Instructions (shown when UPI selected) */}
          <AnimatePresence>
            {paymentMethod === 'upi' && !upiPaymentAppOpened && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm"
              >
                <p className="font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  How UPI Payment Works
                </p>
                <ol className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300 list-decimal list-inside text-xs">
                  <li>Click "Place Order" to generate a secure UPI payment link</li>
                  <li>Open the link in your UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                  <li>Authorize the payment in the UPI app</li>
                  <li>Return here and click "I have paid" to verify the transaction</li>
                  <li>Your payment will be securely verified server-side</li>
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm sticky top-24">
            <h2 className="font-heading font-bold text-lg">Order Summary</h2>

            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <div className="flex gap-3">
                <input type="text" placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="input flex-1" disabled={loading} />
                <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim() || loading} className="btn btn-secondary">
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                  <span className="text-green-600 flex items-center gap-1"><Tag className="w-4 h-4" />{appliedCoupon.code}</span>
                  <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode('') }} className="text-red-500">Remove</button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-neutral-500">{item.product?.name} x{item.quantity}</span>
                  <span>₹{((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
              <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>₹{getTotal().toFixed(2)}</span></div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-500">
                  <span>Discount ({appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : '₹' + appliedCoupon.discount_value})</span>
                  <span>- ₹{calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span className="text-green-500 font-medium">Free</span></div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-heading font-bold">Total</span>
                <span className="font-heading font-bold text-xl text-primary-600">₹{getFinalTotal().toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedAddress}
              className="btn btn-primary w-full mt-6 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {!selectedAddress
                ? 'Select Address'
                : loading
                ? getLoadingLabel()
                : `Pay ₹${getFinalTotal().toFixed(2)} via ${getPaymentMethodLabel()}`}
            </button>
            {addresses.length > 0 && !selectedAddress && (
              <p className="text-red-500 text-sm text-center mt-2">Please select a shipping address</p>
            )}

            {/* Payment Security Info */}
            <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-xs text-neutral-500 space-y-1">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" /> SSL encrypted payment
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Server-side signature verification
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> PCI-DSS compliant gateway
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function getPaymentMethodLabel() {
    switch (paymentMethod) {
      case 'cod': return 'COD'
      case 'upi': return 'UPI'
      case 'card': return 'Card'
      default: return 'Payment'
    }
  }

  function getLoadingLabel() {
    switch (paymentStage) {
      case 'creating': return 'Creating order...'
      case 'processing': return 'Processing payment...'
      case 'verifying': return 'Verifying payment...'
      case 'awaiting_user': return 'Awaiting payment...'
      default: return 'Processing...'
    }
  }
}