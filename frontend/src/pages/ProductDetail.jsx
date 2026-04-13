import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star, Minus, Plus, Truck, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useCart } from '../context/CartContext'
import api from '../services/api'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [recommendations, setRecommendations] = useState([])
  const { addToCart } = useCart()

  useEffect(() => {
    fetchProduct()
  }, [id])

  async function fetchProduct() {
    setLoading(true)
    try {
      const [productRes, recRes] = await Promise.all([
        api.get(`/api/products/${id}`),
        api.get(`/api/products/recommendations?product_id=${id}`),
      ])
      setProduct(productRes.data)
      setRecommendations(recRes.data || [])
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddToCart() {
    await addToCart(parseInt(id), quantity)
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton h-96 rounded-2xl" /></div>
  }

  if (!product) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center"><p>Product not found</p></div>
  }

  const images = product.image_url ? [product.image_url] : ['/placeholder.jpg']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/products" className="inline-flex items-center gap-2 text-neutral-500 hover:text-primary-500 mb-8"><ArrowLeft className="w-4 h-4" />Back to Products</Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <motion.div key={selectedImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-4">
            <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
          </motion.div>
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button key={i} onClick={() => setSelectedImage(i)} className={`w-20 h-20 rounded-lg overflow-hidden ${selectedImage === i ? 'ring-2 ring-primary-500' : ''}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-primary-500 font-medium uppercase tracking-wide">{product.category}</p>
          <h1 className="text-3xl font-heading font-bold mt-2">{product.name}</h1>
          
          <div className="flex items-center gap-2 mt-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < Math.round(product.rating) ? 'fill-accent-500 text-accent-500' : 'text-neutral-300'}`} />
              ))}
            </div>
            <span className="text-neutral-500">({product.review_count} reviews)</span>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <span className="text-3xl font-heading font-bold">Rs. {product.price}</span>
            {product.original_price > product.price && (
              <span className="text-xl text-neutral-500 line-through">Rs. {product.original_price}</span>
            )}
          </div>

          <p className="text-neutral-600 dark:text-neutral-400 mt-6">{product.description}</p>

          <div className="flex items-center gap-4 mt-8">
            <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3"><Minus className="w-4 h-4" /></button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="p-3"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={handleAddToCart} className="flex-1 btn btn-primary flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />Add to Cart
            </button>
            <button className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 text-neutral-500">
              <Truck className="w-5 h-5" />
              <span>Free shipping on orders over $100</span>
            </div>
            <div className="flex items-center gap-3 mt-4 text-neutral-500">
              <ShieldCheck className="w-5 h-5" />
              <span>Secure payment with SSL encryption</span>
            </div>
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-heading font-bold mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recommendations.slice(0, 4).map((p, i) => (
              <Link key={p.id} to={`/product/${p.id}`} className="group">
                <div className="aspect-square rounded-xl overflow-hidden bg-neutral-100 mb-3">
                  <img src={p.image_url || '/placeholder.jpg'} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <h3 className="font-medium line-clamp-2">{p.name}</h3>
                <p className="font-heading font-bold mt-1">Rs. {p.price}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}