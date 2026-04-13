import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RefreshCcw, ShieldCheck } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import api from '../services/api'

const slideshow = [
  { id: 1, title: 'Summer Collection', subtitle: 'Up to 40% Off', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1200', cta: 'Shop Now', link: '/products?featured=true' },
  { id: 2, title: 'New Electronics', subtitle: 'Latest Tech Deals', image: 'https://images.unsplash.com/photo-1468495244123-6c6c332a6d11?w=1200', cta: 'Explore', link: '/products/electronics' },
  { id: 3, title: 'Premium Furniture', subtitle: 'Modern Living', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200', cta: 'Browse', link: '/products/furnitures' },
]

const categories = [
  { name: 'Furniture', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400', path: '/products/furnitures' },
  { name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780ee0c2397?w=400', path: '/products/electronics' },
  { name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400', path: '/products/fashions' },
]

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [featured, setFeatured] = useState([])
  const [newProducts, setNewProducts] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slideshow.length), 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [featuredRes, newRes, recRes] = await Promise.all([
        api.get('/api/products/featured'),
        api.get('/api/products/new'),
        api.get('/api/products/recommendations'),
      ])
      setFeatured(featuredRes.data || [])
      setNewProducts(newRes.data || [])
      setRecommendations(recRes.data || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultProducts = recommendations.length > 0 ? recommendations : featured.length > 0 ? featured : newProducts

  return (
    <div>
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        {slideshow.map((slide, index) => (
          <div key={slide.id} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: index === currentSlide ? 1 : 0, y: index === currentSlide ? 0 : 30 }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-xl">
                  <p className="text-accent-500 uppercase tracking-widest text-sm font-semibold mb-4">{slide.subtitle}</p>
                  <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight tracking-tighter">{slide.title}</h1>
                  <Link to={slide.link} className="btn bg-white text-black hover:bg-neutral-200 inline-flex items-center gap-2 px-8 py-4">
                    {slide.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => setCurrentSlide((currentSlide - 1 + slideshow.length) % slideshow.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentSlide((currentSlide + 1) % slideshow.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slideshow.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)} className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-heading font-bold mb-10 tracking-tight text-center">Curated Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <Link key={cat.name} to={cat.path} className="group relative aspect-[4/3] overflow-hidden rounded-2xl">
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-2xl font-heading font-bold text-white">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {defaultProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-neutral-100 dark:border-neutral-900">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">Featured Collection</h2>
            <Link to="/products" className="text-sm uppercase tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 group">
              View Collection <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {defaultProducts.slice(0, 8).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-neutral-100 dark:border-neutral-900 py-20 bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-neutral-100 dark:divide-neutral-900">
            <div className="pt-8 md:pt-0">
               <Truck className="w-8 h-8 mx-auto mb-6 text-neutral-800 dark:text-neutral-300 stroke-[1.5]" />
              <h3 className="font-heading font-bold text-lg tracking-wide">Complimentary Shipping</h3>
              <p className="text-neutral-500 mt-2 text-sm">On all orders over $100</p>
            </div>
            <div className="pt-8 md:pt-0">
               <RefreshCcw className="w-8 h-8 mx-auto mb-6 text-neutral-800 dark:text-neutral-300 stroke-[1.5]" />
              <h3 className="font-heading font-bold text-lg tracking-wide">Elegant Returns</h3>
              <p className="text-neutral-500 mt-2 text-sm">30-day effortless return policy</p>
            </div>
            <div className="pt-8 md:pt-0">
               <ShieldCheck className="w-8 h-8 mx-auto mb-6 text-neutral-800 dark:text-neutral-300 stroke-[1.5]" />
              <h3 className="font-heading font-bold text-lg tracking-wide">Secure Checkout</h3>
              <p className="text-neutral-500 mt-2 text-sm">Encrypted global payments</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}