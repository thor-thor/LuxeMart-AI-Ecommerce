import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchCart()
    } else {
      setItems([])
    }
  }, [user])

  async function fetchCart() {
    try {
      setLoading(true)
      const response = await api.get('/api/cart')
      setItems(response.data)
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addToCart(productId, quantity = 1) {
    try {
      await api.post('/api/cart', {
        product_id: productId,
        quantity,
      })
      await fetchCart()
    } catch (error) {
      console.error('Failed to add to cart:', error)
      throw error
    }
  }

  async function updateQuantity(itemId, quantity) {
    try {
      await api.put(`/api/cart/${itemId}?quantity=${quantity}`)
      await fetchCart()
    } catch (error) {
      console.error('Failed to update quantity:', error)
      throw error
    }
  }

  async function removeFromCart(itemId) {
    try {
      await api.delete(`/api/cart/${itemId}`)
      await fetchCart()
    } catch (error) {
      console.error('Failed to remove from cart:', error)
      throw error
    }
  }

  async function clearCart() {
    try {
      await api.delete('/api/cart')
      setItems([])
    } catch (error) {
      console.error('Failed to clear cart:', error)
      throw error
    }
  }

  function getTotal() {
    return items.reduce((total, item) => {
      const price = item.product?.price || 0
      return total + price * item.quantity
    }, 0)
  }

  function getItemCount() {
    return items.reduce((count, item) => count + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getTotal,
        getItemCount,
        fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}