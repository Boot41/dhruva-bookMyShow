import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../UI'

export default function Header() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSignIn = () => {
    navigate('/login')
  }

  return (
    <header className="w-full border-b bg-white sticky top-0 z-10">
      <div className="mx-auto flex items-center gap-2">
        {/* Left: Brand/Title */}
        <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          BookMyShow
        </div>

        {/* Center: Search */}
        <div className="flex-2 justify-center px-20">
          <div>
            <Input
              type="text"
              placeholder="Search for movies, theaters..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search"
            />
          </div>
        </div>

        {/* Right: Sign In */}
        <div className="ml-auto">
          <Button variant="primary" onClick={handleSignIn}>
            Sign In
          </Button>
        </div>
      </div>
    </header>
  )
}