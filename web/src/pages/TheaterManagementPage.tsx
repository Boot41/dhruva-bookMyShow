import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { getTheaters, type Theater } from '../Api/TheatersAPI'
import { listScreensForTheater, type Screen } from '../Api/ScreensAPI'
import { listMovies, type MovieOut } from '../Api/MoviesApi'
import { getMovieShows, type Show, createShow, deleteShow } from '../Api/ShowAPI'
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner } from '../UI'
import { listTheaterMemberships } from '../Api/TheaterMembershipsAPI'

export default function TheaterManagementPage() {
  const user = useAppStore((s) => s.user)
  const isAuthed = useAppStore((s) => s.isAuthenticated)()
  const selectedCity = useAppStore((s) => s.selectedCity)
  const navigate = useNavigate()

  const [theaters, setTheaters] = useState<Theater[]>([])
  const [selectedTheaterId, setSelectedTheaterId] = useState<number | ''>('')
  const [allowedTheaterIds, setAllowedTheaterIds] = useState<number[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [selectedScreenId, setSelectedScreenId] = useState<number | ''>('')
  const [movies, setMovies] = useState<MovieOut[]>([])
  const [selectedMovieId, setSelectedMovieId] = useState<number | ''>('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

  const [shows, setShows] = useState<Show[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  // Add Show form state
  const accessToken = user?.token?.access_token
  const [newShowTime, setNewShowTime] = useState<string>('') // HH:MM
  const [newShowPrice, setNewShowPrice] = useState<string>('')
  const [newShowScreenId, setNewShowScreenId] = useState<number | ''>('')

  // Guard route
  useEffect(() => {
    if (!isAuthed) return
    if (!user?.is_theater_admin) {
      navigate('/')
    }
  }, [isAuthed, user?.is_theater_admin, navigate])

  // Load memberships to know which theaters this user can manage
  useEffect(() => {
    let cancelled = false
    async function loadMemberships() {
      if (!user?.id) return
      try {
        const memberships = await listTheaterMemberships({ user_id: user.id, is_active: true })
        if (cancelled) return
        const ids = Array.from(new Set(memberships.map((m: any) => m.theater_id)))
        setAllowedTheaterIds(ids)
        // if only one theater is allowed, preselect it
        if (ids.length === 1) setSelectedTheaterId(ids[0])
      } catch {
        if (!cancelled) setAllowedTheaterIds([])
      }
    }
    loadMemberships()
    return () => { cancelled = true }
  }, [user?.id])

  // Load Theaters and Movies
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setError(null)
        setLoading(true)
        const [ths, mvs] = await Promise.all([
          getTheaters({ city_id: selectedCity?.id }),
          listMovies(),
        ])
        if (!cancelled) {
          const filtered = allowedTheaterIds.length ? ths.filter(t => allowedTheaterIds.includes(t.id)) : []
          setTheaters(filtered)
          // auto select if only one permitted theater
          if (filtered.length === 1) setSelectedTheaterId(filtered[0].id)
          setMovies(mvs)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedCity?.id, allowedTheaterIds])

  // Load Screens for selected theater
  useEffect(() => {
    let cancelled = false
    async function loadScreens() {
      if (!selectedTheaterId) {
        setScreens([])
        setSelectedScreenId('')
        return
      }
      try {
        const res = await listScreensForTheater(selectedTheaterId)
        if (!cancelled) {
          setScreens(res)
          // auto select if single
          if (res.length === 1) setSelectedScreenId(res[0].id)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load screens')
      }
    }
    loadScreens()
    return () => { cancelled = true }
  }, [selectedTheaterId])

  // Load Shows when movie/theater/date change
  useEffect(() => {
    let cancelled = false
    async function loadShows() {
      if (!selectedMovieId || !selectedTheaterId) {
        setShows(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await getMovieShows(selectedMovieId, {
          date,
          theater_id: selectedTheaterId,
        })
        if (!cancelled) setShows(res)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load shows')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadShows()
    return () => { cancelled = true }
  }, [selectedMovieId, selectedTheaterId, date, refreshTick])

  const filteredShows = useMemo(() => {
    if (!shows) return []
    if (!selectedScreenId) return shows
    return shows.filter((s) => s.screen_id === selectedScreenId)
  }, [shows, selectedScreenId])

  const canQuery = Boolean(selectedCity?.id)
  const canManageSelectedTheater = useMemo(() => {
    if (!selectedTheaterId) return false
    return allowedTheaterIds.includes(Number(selectedTheaterId))
  }, [allowedTheaterIds, selectedTheaterId])

  async function handleAddShow() {
    if (!canManageSelectedTheater) return
    if (!accessToken) { setError('You must be logged in'); return }
    if (!selectedMovieId) { setError('Select a movie'); return }
    const screenId = newShowScreenId || selectedScreenId
    if (!screenId) { setError('Select a screen'); return }
    if (!newShowTime) { setError('Enter a show time'); return }
    const priceNum = Number(newShowPrice)
    if (!Number.isFinite(priceNum) || priceNum <= 0) { setError('Enter a valid base price'); return }

    try {
      setError(null)
      await createShow({
        movie_id: Number(selectedMovieId),
        screen_id: Number(screenId),
        show_date: date,
        show_time: /:\d{2}$/.test(newShowTime) ? newShowTime : `${newShowTime}:00`,
        base_price: priceNum,
      }, accessToken)
      // Clear form and refresh list
      setNewShowTime('')
      setNewShowPrice('')
      setNewShowScreenId('')
      setRefreshTick((x) => x + 1)
    } catch (e: any) {
      setError(e?.message || 'Failed to create show')
    }
  }

  async function handleDeleteShow(id: number) {
    if (!canManageSelectedTheater) return
    if (!accessToken) { setError('You must be logged in'); return }
    if (!confirm('Are you sure you want to delete this show?')) return
    try {
      await deleteShow(id, accessToken)
      setRefreshTick((x) => x + 1)
    } catch (e: any) {
      setError(e?.message || 'Failed to delete show')
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Theater Management</h1>
          <p className="text-sm text-gray-500">Add or remove shows for your theater</p>
        </div>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>

      {!user?.is_theater_admin && (
        <div className="alert alert-primary mb-4">You do not have access to this page.</div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selection</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Theater</label>
            <select
              className="input w-full"
              value={selectedTheaterId}
              onChange={(e) => setSelectedTheaterId(e.target.value ? Number(e.target.value) : '')}
              disabled={!canQuery}
            >
              <option value="">Select theater</option>
              {theaters.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {isAuthed && user?.is_theater_admin && allowedTheaterIds.length === 0 && (
              <div className="text-xs text-gray-500 mt-1">You don't have membership in any theater for this city.</div>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">Screen</label>
            <select
              className="input w-full"
              value={selectedScreenId}
              onChange={(e) => setSelectedScreenId(e.target.value ? Number(e.target.value) : '')}
              disabled={!selectedTheaterId}
            >
              <option value="">All screens</option>
              {screens.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Movie</label>
            <select
              className="input w-full"
              value={selectedMovieId}
              onChange={(e) => setSelectedMovieId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select movie</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Date</label>
            <input
              className="input w-full"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Shows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Screen</label>
              <select
                className="input w-full"
                value={newShowScreenId || selectedScreenId || ''}
                onChange={(e) => setNewShowScreenId(e.target.value ? Number(e.target.value) : '')}
                disabled={!canManageSelectedTheater || screens.length === 0}
              >
                <option value="">{selectedScreenId ? 'Use selected screen' : 'Select screen'}</option>
                {screens.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Time</label>
              <input
                type="time"
                className="input w-full"
                value={newShowTime}
                onChange={(e) => setNewShowTime(e.target.value)}
                disabled={!canManageSelectedTheater}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Base Price</label>
              <input
                type="number"
                className="input w-full"
                placeholder="e.g. 250"
                value={newShowPrice}
                onChange={(e) => setNewShowPrice(e.target.value)}
                disabled={!canManageSelectedTheater}
                min={0}
                step={1}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button onClick={handleAddShow} disabled={!canManageSelectedTheater} title={!canManageSelectedTheater ? 'You do not have permission to manage this theater' : ''}>Add Show</Button>
              <Button onClick={() => setRefreshTick((x) => x + 1)} variant="secondary">Refresh</Button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-3"><Spinner /><span>Loading…</span></div>
          ) : error ? (
            <div className="alert alert-primary">{error}</div>
          ) : !selectedMovieId || !selectedTheaterId ? (
            <div className="text-sm text-gray-600">Select a theater and movie to view shows.</div>
          ) : filteredShows.length === 0 ? (
            <div className="text-sm text-gray-600">No shows found for the selection.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Show ID</th>
                    <th className="py-2 pr-4">Screen</th>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Base Price</th>
                    <th className="py-2 pr-4">Available Seats</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShows.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 pr-4">{s.id}</td>
                      <td className="py-2 pr-4">{screens.find(sc => sc.id === s.screen_id)?.name || s.screen_id}</td>
                      <td className="py-2 pr-4">{s.show_time.slice(0,5)}</td>
                      <td className="py-2 pr-4">₹{s.base_price.toFixed(2)}</td>
                      <td className="py-2 pr-4">{s.available_seats}</td>
                      <td className="py-2 pr-4">
                        <button
                          className={`btn btn-sm ${canManageSelectedTheater ? '' : 'opacity-50 cursor-not-allowed'}`}
                          disabled={!canManageSelectedTheater}
                          title={!canManageSelectedTheater ? 'You do not have permission to delete shows for this theater' : 'Delete this show'}
                          onClick={() => handleDeleteShow(s.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
