import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try { await login(email, password); navigate('/') }
    catch (err) { setError(err.response?.data?.detail || 'Invalid email or password') }
    finally { setLoading(false) }
  }

  async function handleGoogleSignIn() {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl p-8 border border-neutral-100 dark:border-neutral-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Welcome Back</h1>
            <p className="text-neutral-500 mt-2">Sign in to continue shopping</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">{error}</motion.div>}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="input pl-12" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="input pl-12 pr-12" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="w-5 h-5 text-neutral-400" /> : <Eye className="w-5 h-5 text-neutral-400" />}</button>
              </div>
              <div className="text-right mt-1">
                <Link to="/forgot-password" className="text-xs text-neutral-500 hover:text-primary-500">Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-dark-card px-2 text-neutral-500">Or continue with</span>
              </div>
            </div>
            <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading} className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center gap-3 transition-colors disabled:opacity-50">
              {googleLoading ? (
                <span className="w-5 h-5 border-2 border-neutral-400 border-t-neutral-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="font-medium">Google</span>
            </button>
          </form>
          <p className="text-center mt-7 text-neutral-500">Don't have an account? <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">Create one</Link></p>
        </div>
      </motion.div>
    </div>
  )
}