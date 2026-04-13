import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Sparkles, CheckCircle, Lock, KeyRound, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState('link')
  const { forgotPassword, forgotPasswordOTP } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (method === 'otp') {
        await forgotPasswordOTP(email)
        navigate('/reset-password-otp', { state: { email } })
      } else {
        await forgotPassword(email)
        setSuccess(true)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset instructions')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl p-8 border border-neutral-100 dark:border-neutral-800 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-heading font-bold mb-2">Check Your Email</h1>
            <p className="text-neutral-500 mb-6">We've sent password reset instructions to <span className="font-medium text-neutral-700 dark:text-neutral-300">{email}</span></p>
            <p className="text-sm text-neutral-500 mb-6">If you don't see the email, check your spam folder. The link will expire in 15 minutes.</p>
            <Link to="/login" className="btn btn-primary w-full">Back to Sign In</Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl p-8 border border-neutral-100 dark:border-neutral-800">
          <Link to="/login" className="inline-flex items-center gap-2 text-neutral-500 hover:text-primary-500 mb-6">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Sign In</span>
          </Link>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Forgot Password?</h1>
            <p className="text-neutral-500 mt-2">No worries, we'll send you reset instructions</p>
          </div>
          
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setMethod('link')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                method === 'link' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span className="text-sm font-medium">Reset Link</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('otp')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                method === 'otp' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">OTP</span>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">{error}</motion.div>}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="input pl-12" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : method === 'otp' ? (
                <>
                  <KeyRound className="w-4 h-4" />
                  Send OTP
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}