import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Sparkles, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token || !emailParam) {
      navigate('/login')
    }
  }, [token, emailParam, navigate])

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
    
    setLoading(true)
    try {
      await resetPassword(emailParam, token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password')
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

  if (!token || !emailParam) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl p-8 border border-neutral-100 dark:border-neutral-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Set New Password</h1>
            <p className="text-neutral-500 mt-2">Enter your new password below</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">{error}</motion.div>}
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" className="input pl-12 pr-12" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="w-5 h-5 text-neutral-400" /> : <Eye className="w-5 h-5 text-neutral-400" />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="input pl-12" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}