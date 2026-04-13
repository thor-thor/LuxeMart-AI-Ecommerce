import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Package, DollarSign, ShoppingCart, Users, TrendingUp, CheckCircle, Clock, XCircle, Eye, Filter, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [analytics, setAnalytics] = useState(null)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({ name: '', description: '', price: 0, original_price: 0, category: 'fashion', stock: 0, image_url: '', is_featured: false, is_new: false })
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()

  useEffect(() => { if (user?.is_admin) fetchData() }, [user])

  async function fetchData() {
    try {
      const [analyticsRes, ordersRes, productsRes] = await Promise.all([
        api.get('/api/admin/analytics'),
        api.get('/api/admin/orders'),
        api.get('/api/admin/products')
      ])
      setAnalytics(analyticsRes.data)
      setOrders(ordersRes.data || [])
      setProducts(productsRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      await api.put(`/api/admin/orders/${orderId}/status`, { status })
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
    } catch (e) { console.error(e) }
  }

  async function saveProduct() {
    try {
      if (editingProduct) {
        await api.put(`/api/admin/products/${editingProduct.id}`, productForm)
      } else {
        await api.post('/api/admin/products', productForm)
      }
      setShowProductModal(false)
      setEditingProduct(null)
      setProductForm({ name: '', description: '', price: 0, original_price: 0, category: 'fashion', stock: 0, image_url: '', is_featured: false, is_new: false })
      fetchData()
    } catch (e) { console.error(e) }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return
    try { await api.delete(`/api/admin/products/${id}`); setProducts(products.filter(p => p.id !== id)) }
    catch (e) { console.error(e) }
  }

  function openEdit(product) {
    setEditingProduct(product)
    setProductForm({ ...product, original_price: product.original_price || 0 })
    setShowProductModal(true)
  }

  const filteredOrders = orders.filter(o => statusFilter === 'all' || o.status === statusFilter)

  if (!user?.is_admin) return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><p>Admin access required</p></div>
  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-32 rounded-xl" /></div></div>

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
  ]

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const statCards = [
    { label: 'Total Revenue', value: `Rs. ${analytics?.total_revenue?.toFixed(2) || '0.00'}`, icon: DollarSign, color: 'bg-gradient-to-br from-green-500 to-green-600', text: 'text-green-600' },
    { label: 'Total Orders', value: analytics?.total_orders || 0, icon: ShoppingCart, color: 'bg-gradient-to-br from-blue-500 to-blue-600', text: 'text-blue-600' },
    { label: 'Pending Orders', value: analytics?.pending_orders || 0, icon: Clock, color: 'bg-gradient-to-br from-yellow-500 to-yellow-600', text: 'text-yellow-600' },
    { label: 'Total Products', value: analytics?.total_products || 0, icon: Package, color: 'bg-gradient-to-br from-purple-500 to-purple-600', text: 'text-purple-600' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Shopkeeper Panel</h1>
          <p className="text-neutral-500 mt-1">Manage your store</p>
        </div>
        <div className="text-sm text-neutral-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-medium transition-all ${activeTab === tab.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-white dark:bg-dark-card hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500">{stat.label}</p>
                      <p className="text-2xl font-heading font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold text-lg mb-4">Recent Orders</h3>
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                      <div>
                        <p className="font-mono text-sm font-medium">{order.order_number}</p>
                        <p className="text-xs text-neutral-500">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Rs. {order.total_amount}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold text-lg mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setActiveTab('products')} className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-left hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
                    <Plus className="w-5 h-5 text-primary-500 mb-2" />
                    <p className="font-medium">Add Product</p>
                  </button>
                  <button onClick={() => setActiveTab('orders')} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <Eye className="w-5 h-5 text-blue-500 mb-2" />
                    <p className="font-medium">View Orders</p>
                  </button>
                  <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-left hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
                    <p className="font-medium">Confirm Shipments</p>
                  </button>
                  <button className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-left hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                    <Package className="w-5 h-5 text-purple-500 mb-2" />
                    <p className="font-medium">Manage Stock</p>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="orders">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{s}</button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input type="text" placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium">Order #</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {filteredOrders.filter(o => !searchQuery || o.order_number.toLowerCase().includes(searchQuery.toLowerCase())).map(order => (
                      <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                        <td className="px-6 py-4 font-mono text-sm font-medium">{order.order_number}</td>
                        <td className="px-6 py-4 font-medium">Rs. {order.total_amount}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-500">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 bg-white dark:bg-neutral-800">
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="products">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                <h3 className="font-heading font-bold">Products ({products.length})</h3>
                <button onClick={() => { setEditingProduct(null); setShowProductModal(true) }} className="btn btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Add Product</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium">Product</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Category</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Price</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Stock</th>
                      <th className="px-6 py-3 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
                              {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <p className="font-medium line-clamp-1">{p.name}</p>
                              <p className="text-xs text-neutral-500 line-clamp-1">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-medium capitalize">{p.category}</span>
                        </td>
                        <td className="px-6 py-4 font-medium">Rs. {p.price}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-xs ${p.stock > 10 ? 'bg-green-100 text-green-700' : p.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.stock}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openEdit(p)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg inline-flex"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg inline-flex ml-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProductModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProductModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-heading font-bold mb-6">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name</label>
                  <input type="text" placeholder="Enter product name" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea placeholder="Product description" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="input" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input type="number" placeholder="0.00" value={productForm.price} onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value)})} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Original Price ($)</label>
                    <input type="number" placeholder="0.00" value={productForm.original_price} onChange={e => setProductForm({...productForm, original_price: parseFloat(e.target.value)})} className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="input">
                      <option value="fashion">Fashion</option>
                      <option value="electronics">Electronics</option>
                      <option value="furnitures">Furnitures</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stock</label>
                    <input type="number" placeholder="0" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: parseInt(e.target.value)})} className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Image URL</label>
                  <input type="text" placeholder="https://..." value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} className="input" />
                </div>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.is_featured} onChange={e => setProductForm({...productForm, is_featured: e.target.checked})} className="w-4 h-4 rounded" />
                    <span className="text-sm">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.is_new} onChange={e => setProductForm({...productForm, is_new: e.target.checked})} className="w-4 h-4 rounded" />
                    <span className="text-sm">New Arrival</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={saveProduct} className="btn btn-primary flex-1">Save Product</button>
                <button onClick={() => setShowProductModal(false)} className="btn bg-neutral-200 dark:bg-neutral-700 flex-1">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}