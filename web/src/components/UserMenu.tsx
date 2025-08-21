import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

export default function UserMenu() {
  const user = useAppStore((s) => s.user)
  const clearUser = useAppStore((s) => s.clearUser)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  if (!user) return null

  const firstName = (() => {
    // Prefer explicit first name if present in future
    const email = user.email ?? 'User'
    const base = email.split('@')[0]
    const token = base.split(/[._-]/)[0]
    return token.charAt(0).toUpperCase() + token.slice(1)
  })()
  const initial = firstName.charAt(0).toUpperCase() || 'U'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[color:var(--color-secondary-100)]"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[color:var(--color-primary-600)] text-white text-sm font-semibold"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="text-sm text-[color:var(--color-secondary-900)]">
          {firstName}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 rounded border bg-white shadow-md py-2 text-sm"
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-[color:var(--color-secondary-100)]"
            onClick={() => {
              try { localStorage.removeItem('access_token') } catch {}
              clearUser()
              setOpen(false)
              navigate('/')
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
