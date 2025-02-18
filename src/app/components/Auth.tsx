'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      alert('Check your email for the login link!')
    } catch (error) {
      alert(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      alert(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Game Timer</h1>
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2 font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Your email"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Your password"
              required
            />
          </div>
          <div className="space-y-2">
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold"
            >
              {loading ? 'Loading ...' : 'Sign Up'}
            </button>
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold"
            >
              {loading ? 'Loading ...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
