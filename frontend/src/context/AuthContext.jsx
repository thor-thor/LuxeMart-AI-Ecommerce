import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { signInWithGoogle, isFirebaseConfigured } from '../firebase'
import { getAuth as getFirebaseAuth } from 'firebase/auth'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const response = await api.get('/api/auth/me')
        setUser(response.data)
      } catch (error) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      }
    }
    setLoading(false)
  }

  async function login(email, password) {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    const response = await api.post('/api/auth/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    const { access_token, refresh_token } = response.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    await checkAuth()
  }

  async function loginWithGoogle() {
    if (!isFirebaseConfigured()) {
      throw new Error("Google Sign-In is not configured. Please set up Firebase credentials in .env file.")
    }
    const googleUser = await signInWithGoogle()
    const response = await api.post('/api/auth/google-auth', googleUser)
    const { access_token, refresh_token } = response.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    await checkAuth()
  }

  async function forgotPassword(email) {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  }

  async function forgotPasswordOTP(email) {
    const response = await api.post('/api/auth/forgot-password-otp', { email })
    return response.data
  }

  async function resetPassword(email, token, newPassword) {
    const response = await api.post('/api/auth/reset-password', {
      email,
      token,
      new_password: newPassword
    })
    return response.data
  }

  async function resetPasswordOTP(email, otp, newPassword) {
    const response = await api.post('/api/auth/reset-password-otp', {
      email,
      otp,
      new_password: newPassword
    })
    return response.data
  }

  async function register(data) {
    const response = await api.post('/api/auth/register', data)
    await login(data.email, data.password)
    return response.data
  }

  function logout() {
    try {
      const firebaseAuth = getFirebaseAuth()
      if (firebaseAuth) {
        firebaseAuth.signOut()
      }
    } catch (e) {
      // Firebase not initialized, ignore
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, forgotPassword, forgotPasswordOTP, resetPassword, resetPasswordOTP, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}