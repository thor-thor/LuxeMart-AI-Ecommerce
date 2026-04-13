import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import api from '../services/api'

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your LuxeMart AI Assistant. How can I inspire your shopping today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const payload = { messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }
      const res = await api.post('/api/ai/chat', payload)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'I am sorry, I am having trouble connecting to my servers right now.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-80 sm:w-96 h-[500px] mb-4 bg-white dark:bg-dark-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-primary-500 dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-accent-500" />
                <div>
                  <h3 className="font-heading font-bold text-sm tracking-wide">LuxeMart AI</h3>
                  <p className="text-[10px] text-neutral-300 tracking-widest uppercase">Personal Shopper</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-dark-surface">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-sm' 
                        : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-neutral-800">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full pl-4 pr-12 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
                  disabled={isLoading}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center ${
          isOpen ? 'bg-neutral-800 outline-none' : 'bg-black text-white dark:bg-white dark:text-black'
        }`}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  )
}
