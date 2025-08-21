import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../UI'
import { useAppStore } from '../store'
import { fetchCities, type City } from '../Api/CitiesAPI'
import UserMenu from './UserMenu'
import { SearchAPI, type SearchResponse } from '../Api/SearchAPI'

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
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState<number>(-1)
  const [results, setResults] = useState<SearchResponse>({ movies: [], theaters: [] })
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [abortCtl, setAbortCtl] = useState<AbortController | null>(null)
  const cacheRef = useState(() => new Map<string, { ts: number; data: SearchResponse }>())[0]

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

  // Debounced unified search
  useEffect(() => {
    const q = query.trim()
    const cityId = selectedCity?.id
    if (q.length < 2) {
      setResults({ movies: [], theaters: [] })
      setOpen(false)
      setSearchError(null)
      setHighlightIdx(-1)
      if (abortCtl) abortCtl.abort()
      return
    }

    const key = `${cityId ?? 'na'}|${q}`
    const cached = cacheRef.get(key)
    const now = Date.now()
    if (cached && now - cached.ts < 2 * 60 * 1000) {
      setResults(cached.data)
      setOpen(true)
      setSearchError(null)
      setHighlightIdx(-1)
      return
    }

    // debounce
    const timeout = setTimeout(async () => {
      if (abortCtl) abortCtl.abort()
      const ctl = new AbortController()
      setAbortCtl(ctl)
      setLoadingSearch(true)
      setSearchError(null)
      try {
        const data = await SearchAPI.unifiedSearch({ q, city_id: cityId, limit_movies: 5, limit_theaters: 5, signal: ctl.signal })
        setResults(data)
        cacheRef.set(key, { ts: Date.now(), data })
        setOpen(true)
        setHighlightIdx(-1)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        setSearchError(e?.message || 'Search failed')
      } finally {
        setLoadingSearch(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
    }
  }, [query, selectedCity?.id])

  // Flattened list for keyboard nav: movies then theaters
  const flatItems: Array<{ type: 'movie' | 'theater'; id: number; label: string; sub?: string }> = [
    ...results.movies.map(m => ({ type: 'movie' as const, id: m.id, label: m.title })),
    ...results.theaters.map(t => ({ type: 'theater' as const, id: t.id, label: t.name, sub: t.address })),
  ]

  const onEnter = () => {
    if (!open) return
    const item = highlightIdx >= 0 ? flatItems[highlightIdx] : null
    if (item) {
      if (item.type === 'movie') {
        const sp = new URLSearchParams()
        sp.set('movie_id', String(item.id))
        if (selectedCity?.id) sp.set('city_id', String(selectedCity.id))
        navigate({ pathname: '/book', search: `?${sp.toString()}` })
        setOpen(false)
        setQuery('')
      } else {
        // TODO: Decide navigation for theater result (no dedicated route yet)
        setOpen(false)
      }
    } else {
      // No selection: could navigate to a full search page if added later
      setOpen(false)
    }
  }

  return (
    <header className="w-full border-b bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 flex items-center gap-4 h-16">
        {/* Left: Brand/Title */}
        <div className="text-xl font-bold shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
          BookMyShow
        </div>

        {/* Center: Search */}
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search for movies, theaters..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
            className="h-11"
            onFocus={() => {
              if ((results.movies.length || results.theaters.length) && query.trim().length >= 2) setOpen(true)
            }}
            onKeyDown={(e) => {
              if (!open) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlightIdx((i) => Math.min(i + 1, flatItems.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightIdx((i) => Math.max(i - 1, -1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                onEnter()
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
          />
          {open && (
            <div className="absolute left-0 right-0 mt-2 bg-white border rounded-md shadow-lg max-h-96 overflow-auto">
              <div className="p-2 text-sm text-gray-600 flex items-center justify-between">
                <span>Results</span>
                {loadingSearch && <span className="text-xs">Searching…</span>}
              </div>
              {searchError && <div className="px-3 pb-2 text-sm text-red-600">{searchError}</div>}
              {!searchError && flatItems.length === 0 && (
                <div className="px-3 pb-3 text-sm text-gray-600">No matches</div>
              )}

              {results.movies.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500">Movies</div>
                  {results.movies.map((m, idx) => {
                    const i = idx
                    const isHi = highlightIdx === i
                    return (
                      <button
                        key={`m-${m.id}`}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${isHi ? 'bg-gray-100' : ''}`}
                        onMouseEnter={() => setHighlightIdx(i)}
                        onClick={() => {
                          const sp = new URLSearchParams()
                          sp.set('movie_id', String(m.id))
                          if (selectedCity?.id) sp.set('city_id', String(selectedCity.id))
                          navigate({ pathname: '/book', search: `?${sp.toString()}` })
                          setOpen(false)
                          setQuery('')
                        }}
                      >
                        <div className="font-medium">{m.title}</div>
                      </button>
                    )
                  })}
                </div>
              )}

              {results.theaters.length > 0 && (
                <div className="border-t mt-1">
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500">Theaters</div>
                  {results.theaters.map((t, idx) => {
                    const i = results.movies.length + idx
                    const isHi = highlightIdx === i
                    return (
                      <div
                        key={`t-${t.id}`}
                        className={`px-3 py-2 hover:bg-gray-50 cursor-default ${isHi ? 'bg-gray-100' : ''}`}
                        onMouseEnter={() => setHighlightIdx(i)}
                      >
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-gray-600 line-clamp-1">{t.address}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
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