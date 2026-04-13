import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Sparkles, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ResetPasswordOTP() {
  const location = useLocation()
  const initialEmail = location.state?.email || ''
  
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPasswordOTP } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initialEmail) {
      navigate('/forgot-password')
    }
  }, [initialEmail, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }
    
    setLoading(true)
    try {
      await resetPasswordOTP(email, otp, password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please check your OTP.')
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
            <h1 className="text-2xl font-heading font-bold mb-2">Password Reset!</h1>
            <p className="text-neutral-500 mb-6">Your password has been reset successfully.</p>
            <Link to="/login" className="btn btn-primary w-full">Go to Sign In</Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!initialEmail) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl p-8 border border-neutral-100 dark:border-neutral-800">
          <Link to="/forgot-password" className="inline-flex items-center gap-2 text-neutral-500 hover:text-primary-500 mb-6">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Reset Password with OTP</h1>
            <p className="text-neutral-500 mt-2">Enter the OTP sent to your email</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">{error}</motion.div>}
            
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" value={email} readOnly className="input bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Enter OTP</label>
              <input 
                type="text" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                placeholder="Enter 6-digit OTP" 
                className="input text-center text-2xl tracking-widest font-mono" 
                maxLength={6}
                required 
              />
              <p className="text-xs text-neutral-500 mt-2">Check your email for the 6-digit OTP</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="input pl-12 pr-12" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="w-5 h-5 text-neutral-400" /> : <Eye className="w-5 h-5 text-neutral-400" />}</button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="input pl-12" required />
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Reset Password
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}