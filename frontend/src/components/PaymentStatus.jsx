import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, Loader2, CreditCard, Wallet, Banknote } from 'lucide-react'
import api from '../services/api'

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    darkBgColor: 'bg-yellow-900/20',
    label: 'Pending',
    description: 'Waiting for payment confirmation',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    darkBgColor: 'bg-blue-900/20',
    label: 'Processing',
    description: 'Payment is being verified',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    darkBgColor: 'bg-green-900/20',
    label: 'Completed',
    description: 'Payment verified successfully',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    darkBgColor: 'bg-red-900/20',
    label: 'Failed',
    description: 'Payment could not be verified',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-neutral-500',
    bgColor: 'bg-neutral-50',
    darkBgColor: 'bg-neutral-900/20',
    label: 'Cancelled',
    description: 'Payment was cancelled',
  },
}

const methodConfig = {
  card: { icon: CreditCard, label: 'Card', color: '#2563EB' },
  upi: { icon: Wallet, label: 'UPI', color: '#7C3AED' },
  cod: { icon: Banknote, label: 'Cash on Delivery', color: '#059669' },
}

export default function PaymentStatus({ transaction: propTransaction, onRetry }) {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [transaction, setTransaction] = useState(propTransaction || null)
  const [loading, setLoading] = useState(!propTransaction)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!propTransaction && orderId) {
      fetchTransaction()
    }
  }, [orderId, propTransaction])

  async function fetchTransaction() {
    try {
      setLoading(true)
      const historyRes = await api.get('/api/payments/history')
      const txn = historyRes.data.transactions.find(
        t => t.order_id === parseInt(orderId)
      )
      if (txn) {
        setTransaction(txn)
      } else {
        // Try fetching by the orders endpoint
        const orderRes = await api.get(`/api/orders/${orderId}`)
        setTransaction({
          transaction_id: 0,
          order_id: orderRes.data.id,
          payment_method: orderRes.data.payment_method,
          amount: parseFloat(orderRes.data.total_amount),
          status: mappedStatus(orderRes.data),
          razorpay_order_id: null,
          razorpay_payment_id: null,
          upi_transaction_id: null,
          reference_id: `REF-${orderRes.data.id}`,
          verified: orderRes.data.payment_status === 'completed',
          created_at: orderRes.data.created_at || new Date().toISOString(),
        })
      }
    } catch (err) {
      setError('Failed to load payment details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function mappedStatus(order) {
    if (order.payment_status === 'completed') return 'completed'
    if (order.payment_status === 'failed') return 'failed'
    return order.payment_status || 'pending'
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
        <p className="text-neutral-500 mt-4">Loading payment details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold mt-4 text-red-600">Unable to Load</h2>
        <p className="text-neutral-500 mt-2">{error}</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Back to Orders
        </button>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 mx-auto text-neutral-300" />
        <h2 className="text-2xl font-bold mt-4">Payment Not Found</h2>
        <p className="text-neutral-500 mt-2">No payment transaction found for this order.</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          View Orders
        </button>
      </div>
    )
  }

  const status = statusConfig[transaction.status] || statusConfig.pending
  const method = methodConfig[transaction.payment_method] || methodConfig.card
  const MethodIcon = method.icon
  const StatusIcon = status.icon

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-neutral-500 hover:text-primary-500 mb-6 text-sm font-medium transition-colors"
      >
        ← Back to Orders
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border transition-all"
        style={{
          backgroundColor: 'var(--card-bg, white)',
          borderColor: status.bgColor.replace('bg-', 'border-'),
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl ${status.bgColor} ${status.darkBgColor} flex-shrink-0`}
          >
            <StatusIcon className={`w-6 h-6 ${status.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <MethodIcon className="w-4 h-4" style={{ color: method.color }} />
                <span className="font-medium text-sm">{method.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: method.color, backgroundColor: `${method.color}15` }}>
                  {transaction.reference_id || `PAY-${transaction.id}`}
                </span>
              </div>
              <Badge status={transaction.status} />
            </div>

            <p className="text-sm text-neutral-500 mt-1">
              {status.description}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-neutral-500">Amount</p>
                <p className="font-semibold">₹{parseFloat(transaction.amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Verified</p>
                <p className={`font-medium ${transaction.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                  {transaction.verified ? (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 inline" /> Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 inline" /> Pending
                    </span>
                  )}
                </p>
              </div>
              {transaction.upi_transaction_id && (
                <div className="col-span-2">
                  <p className="text-neutral-500">UPI Transaction ID</p>
                  <p className="font-mono text-xs break-all">{transaction.upi_transaction_id}</p>
                </div>
              )}
              {transaction.razorpay_payment_id && (
                <div className="col-span-2">
                  <p className="text-neutral-500">Payment ID</p>
                  <p className="font-mono text-xs break-all">{transaction.razorpay_payment_id}</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {transaction.status === 'failed' && onRetry && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-3 border-t border-neutral-200"
                >
                  <button
                    onClick={() => onRetry(transaction.id)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Retry Payment
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Badge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-neutral-100 text-neutral-700',
  }

  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
        colors[status] || colors.pending
      } uppercase tracking-wide`}
    >
      {status}
    </span>
  )
}