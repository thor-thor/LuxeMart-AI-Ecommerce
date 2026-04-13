import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useCart()
  const imageUrl = product.image_url || `/images/${product.category}/${product.id}.webp`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link to={`/product/${product.id}`} className="group block bg-white dark:bg-dark-card overflow-hidden transition-all duration-700">
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 dark:bg-neutral-900 rounded-sm">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.target.src = '/placeholder.jpg' }}
          />
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.is_new && (
              <span className="px-2.5 py-1 bg-primary-500 text-white text-xs font-medium rounded-full flex items-center gap-1 shadow-lg shadow-primary-500/30">
                <Zap className="w-3 h-3" />New
              </span>
            )}
            {product.is_featured && (
              <span className="px-3 py-1.5 bg-black text-white text-[10px] uppercase tracking-widest font-medium">Featured</span>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); }}
            className="absolute top-3 right-3 p-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <Heart className="w-4 h-4 text-neutral-600" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <button
              onClick={(e) => { e.preventDefault(); addToCart(product.id); }}
              className="w-full py-3 bg-white dark:bg-black text-black dark:text-white text-sm tracking-widest uppercase font-medium flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />Add to Cart
            </button>
          </div>
        </div>
        <div className="py-4">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{product.category}</p>
          <h3 className="text-sm font-medium mt-1.5 line-clamp-1 group-hover:text-black transition-colors">{product.name}</h3>
          <div className="flex items-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(product.rating) ? 'fill-accent-500 text-accent-500' : 'text-neutral-300'}`} />
            ))}
            <span className="text-xs text-neutral-500 ml-1">({product.review_count})</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium text-black dark:text-white">Rs. {product.price}</span>
            {product.original_price > product.price && (
              <span className="text-xs text-neutral-400 line-through">Rs. {product.original_price}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}