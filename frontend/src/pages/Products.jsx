import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Filter, Grid, List, SlidersHorizontal } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import api from '../services/api'

export default function Products() {
  const { category } = useParams()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [sortBy, setSortBy] = useState('newest')
  const search = searchParams.get('search') || ''

  useEffect(() => {
    fetchProducts()
  }, [category, search])

  async function fetchProducts() {
    setLoading(true)
    try {
      let params = ''
      if (category) params += `category=${category}&`
      if (search) params += `search=${search}&`
      const response = await api.get(`/api/products?${params}`)
      let data = response.data || []
      if (sortBy === 'price-low') data = data.sort((a, b) => a.price - b.price)
      else if (sortBy === 'price-high') data = data.sort((a, b) => b.price - a.price)
      else if (sortBy === 'rating') data = data.sort((a, b) => b.rating - a.rating)
      setProducts(data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const categoryName = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'All Products'
  const pageTitle = search ? `Search: "${search}"` : categoryName

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">{pageTitle}</h1>
          <p className="text-neutral-500 mt-1">{products.length} products found</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); fetchProducts(); }} className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent focus:outline-none focus:border-primary-500">
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <div className="flex border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-primary-500 text-white' : ''}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-primary-500 text-white' : ''}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {[...Array(8)].map((_, i) => (
            <motion div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-neutral-500">No products found</p>
        </div>
      ) : (
        <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}