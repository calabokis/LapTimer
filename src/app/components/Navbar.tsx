'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Navbar() {
  const pathname = usePathname()
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }
  
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center font-bold text-xl">
              LapTimer
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                Timer
              </Link>
              <Link
                href="/statistics"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/statistics' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                Statistics
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleSignOut}
              className="px-3 py-2 rounded-md text-sm font-medium text-blue-100 hover:bg-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
