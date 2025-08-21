import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../UI'
import { useAppStore } from '../store'
import { fetchCities, type City } from '../Api/CitiesAPI'

type HeaderProps = {
  enableCitySelect?: boolean
}

export default function Header({ enableCitySelect = false }: HeaderProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const selectedCity = useAppStore((s) => s.selectedCity)
  const setSelectedCity = useAppStore((s) => s.setSelectedCity)
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
    <header className="w-full border-b bg-white sticky top-0 z-10 pb-xl">
      <div className="mx-auto flex items-center gap-4">
        {/* Left: Brand/Title */}
        <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          BookMyShow
        </div>

        {/* Center: Search */}
        <div className="flex-2 justify-center px-5">
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

        {/* City Select (Landing-only) */}
        {enableCitySelect && (
          <div className="min-w-[12rem]">
            <select
              className="select"
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
          <div className="p-2">
            <span className="text-xl italic font-semibold" aria-label="Selected city">
              {selectedCity.name}
            </span>
          </div>
        )}

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