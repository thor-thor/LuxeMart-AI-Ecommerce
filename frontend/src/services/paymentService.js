import api from './api'

const paymentService = {
  /**
   * Create a payment order for card or UPI payments.
   * @param {number} orderId - The order ID
   * @param {string} method - Payment method: 'card', 'upi', or 'cod'
   * @returns {Promise<Object>} Payment order details
   */
  createPaymentOrder: async (orderId, method) => {
    const response = await api.post('/api/payments/create-order', {
      order_id: orderId,
      payment_method: method,
    })
    return response.data
  },

  /**
   * Verify a Razorpay card payment.
   * @param {Object} params - Verification parameters
   * @returns {Promise<Object>} Verification result
   */
  verifyPayment: async ({ razorpayPaymentId, razorpayOrderId, orderId, razorpaySignature }) => {
    const response = await api.post('/api/payments/verify', {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      order_id: orderId,
      razorpay_signature: razorpaySignature,
    })
    return response.data
  },

  /**
   * Verify a UPI payment server-side.
   * @param {Object} params - UPI verification parameters
   * @returns {Promise<Object>} Verification result
   */
  verifyUpiPayment: async ({ orderId, upiTransactionId, upiMerchantId, amount, checksum, timestamp }) => {
    const response = await api.post('/api/payments/verify-upi', {
      order_id: orderId,
      upi_transaction_id: upiTransactionId,
      upi_merchant_id: upiMerchantId,
      amount,
      checksum,
      timestamp,
    })
    return response.data
  },

  /**
   * Confirm a Cash on Delivery payment upon delivery.
   * @param {number} orderId - The order ID
   * @returns {Promise<Object>} Confirmation result
   */
  confirmCodPayment: async (orderId) => {
    const response = await api.post('/api/payments/confirm-cod', {
      order_id: orderId,
    })
    return response.data
  },

  /**
   * Get payment history for the current user.
   * @returns {Promise<Array>} List of payment transactions
   */
  getPaymentHistory: async () => {
    const response = await api.get('/api/payments/history')
    return response.data
  },

  /**
   * Get available payment methods and limits.
   * @returns {Promise<Object>} Payment methods and limits
   */
  getPaymentMethods: async () => {
    const response = await api.get('/api/payments/methods')
    return response.data
  },

  /**
   * Get status of a specific transaction.
   * @param {number} transactionId - The transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  getTransactionStatus: async (transactionId) => {
    const response = await api.get(`/api/payments/${transactionId}`)
    return response.data
  },

  /**
   * Retry a failed card payment.
   * @param {number} transactionId - The failed transaction ID
   * @returns {Promise<Object>} New payment order details
   */
  retryPayment: async (transactionId) => {
    const response = await api.post(`/api/payments/retry/${transactionId}`)
    return response.data
  },

  /**
   * Set up Razorpay payment handler for card payments.
   * @param {Object} config - Payment configuration
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @returns {Promise<RazorpayCheckoutHandler>|null>} Razorpay handler or null if not loaded
   */
  setupRazorpayHandler: (config, onSuccess, onError) => {
    if (typeof window.Razorpay === 'undefined') {
      onError?.('Razorpay SDK not loaded')
      return null
    }

    const handlerOptions = {
      key: config.keyId,
      amount: config.amount,
      currency: config.currency || 'INR',
      name: config.name || 'LuxeMart',
      description: config.description || 'Order Payment',
      order_id: config.orderId,
      handler: async function (response) {
        try {
          const result = await paymentService.verifyPayment({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            orderId: config.orderId,
            razorpaySignature: response.razorpay_signature,
          })
          onSuccess?.(result)
        } catch (error) {
          onError?.(error?.response?.data?.detail || 'Payment verification failed')
        }
      },
      modal: {
        ondismiss: function () {
          onError?.('Payment cancelled by user')
        },
      },
      prefill: config.prefill || {},
      notes: config.notes || {},
      theme: {
        color: config.themeColor || '#3B82F6',
      },
    }

    return new window.Razorpay(handlerOptions)
  },
}

export default paymentService