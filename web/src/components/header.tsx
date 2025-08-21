import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../UI'
import { useAppStore } from '../store'
import { fetchCities, type City } from '../Api/CitiesAPI'
import UserMenu from './UserMenu'

type HeaderProps = {
  enableCitySelect?: boolean
}

export default function Header({ enableCitySelect = false }: HeaderProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const selectedCity = useAppStore((s) => s.selectedCity)
  const setSelectedCity = useAppStore((s) => s.setSelectedCity)
  const user = useAppStore((s) => s.user)
  const [cities, setCities] = useState<City[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [citiesError, setCitiesError] = useState<string | null>(null)

  const handleSignIn = () => {
    navigate('/login')
  }

  useEffect(() => {
    if (!enableCitySelect) return
    let mounted = true
    setLoadingCities(true)
    setCitiesError(null)
    fetchCities()
      .then((list) => { if (mounted) setCities(list) })
      .catch((err: any) => { if (mounted) setCitiesError(err?.message ?? 'Failed to load cities') })
      .finally(() => { if (mounted) setLoadingCities(false) })
    return () => { mounted = false }
  }, [enableCitySelect])

  return (
    <header className="w-full border-b bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 flex items-center gap-4 h-16">
        {/* Left: Brand/Title */}
        <div className="text-xl font-bold shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
          BookMyShow
        </div>

        {/* Center: Search */}
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search for movies, theaters..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
            className="h-11"
          />
        </div>

        {/* City Select (Landing-only) */}
        {enableCitySelect && (
          <div className="min-w-[12rem]">
            <select
              className="select h-11"
              aria-label="Select city"
              value={selectedCity?.id ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                const city = cities.find((c) => c.id === id) || null
                setSelectedCity(city)
              }}
              disabled={loadingCities}
            >
              <option value="" disabled>
                {loadingCities ? 'Loading cities…' : 'Select a city'}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.state ? `, ${c.state}` : ''}
                </option>
              ))}
            </select>
            {citiesError && (
              <button
                className="text-xs text-[color:var(--color-primary-600)] underline mt-1"
                onClick={() => {
                  setLoadingCities(true)
                  setCitiesError(null)
                  fetchCities()
                    .then(setCities)
                    .catch((err: any) => setCitiesError(err?.message ?? 'Failed to load cities'))
                    .finally(() => setLoadingCities(false))
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}
        {!enableCitySelect && selectedCity && (
          <div className="px-1">
            <span className="text-xl italic font-semibold" aria-label="Selected city">
              {selectedCity.name}
            </span>
          </div>
        )}

        {/* Right: Auth */}
        <div className="ml-auto">
          {user ? (
            <UserMenu />
          ) : (
            <Button variant="primary" className="h-11" onClick={handleSignIn}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}