import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Wishlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => { if (user) fetchWishlist() }, [user])
  async function fetchWishlist() { try { const r = await api.get('/api/wishlist'); setItems(r.data || []) } catch (e) { console.error(e) } finally { setLoading(false) } }
  async function removeFromWishlist(id) { try { await api.delete('/api/wishlist/' + id); setItems(items.filter(i => i.id !== id)) } catch (e) { console.error(e) } }

  if (!user) return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><p>Please <Link to="/login" className="text-primary-500">sign in</Link> to view your wishlist.</p></div>
  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="skeleton h-96 rounded-2xl" /></div>
  if (items.length === 0) return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><Heart className="w-16 h-16 mx-auto text-neutral-300" /><h2 className="text-2xl font-heading font-bold mt-6">Your wishlist is empty</h2><Link to="/products" className="btn btn-primary mt-8">Browse Products</Link></div>

  return <div className="max-w-7xl mx-auto px-4 py-8"><h1 className="text-2xl font-heading font-bold">My Wishlist</h1><p className="text-neutral-500 mt-2">{items.length} items saved</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">{items.map((item) => (<div key={item.id} className="card overflow-hidden"><Link to={'/product/' + item.product_id} className="aspect-[4/3] overflow-hidden bg-neutral-100"><img src={item.product?.image_url || '/placeholder.jpg'} alt={item.product?.name} className="w-full h-full object-cover" /></Link><div className="p-4"><Link to={'/product/' + item.product_id} className="font-medium">{item.product?.name}</Link><p className="font-heading font-bold mt-2">Rs. {item.product?.price}</p><button onClick={() => removeFromWishlist(item.id)} className="w-full mt-3 py-2 bg-red-50 text-red-500 rounded-lg">Remove</button></div></div>))}</div></div>
}
