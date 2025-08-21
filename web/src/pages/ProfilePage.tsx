import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { listBookings, type BookingOut, ApiError } from '../Api/BookingsAPI'
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner } from '../UI'

export default function ProfilePage() {
  const user = useAppStore((s) => s.user)
  const isAuthed = useAppStore((s) => s.isAuthenticated)()
  const navigate = useNavigate()

  const userId = user?.id

  const [bookings, setBookings] = useState<BookingOut[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthed) return
    if (!userId) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    listBookings({ user_id: userId })
      .then((res) => {
        if (!cancelled) setBookings(res)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        if (e instanceof ApiError) setError(e.message)
        else setError('Failed to load bookings')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthed, userId])

  const greeting = useMemo(() => {
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    return name || user?.email || 'User'
  }, [user])

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You need to be logged in to view your profile and bookings.</p>
            <div className="flex gap-3">
              <Link to="/login" className="btn btn-primary">Go to Login</Link>
              <Link to="/signup" className="btn">Create an account</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hello, {greeting}</h1>
          <p className="text-sm text-gray-500">Manage your bookings and account</p>
        </div>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Spinner />
              <span>Loading bookings…</span>
            </div>
          ) : error ? (
            <div className="alert alert-primary">{error}</div>
          ) : (bookings?.length ?? 0) === 0 ? (
            <div className="text-sm text-gray-600">
              You have no bookings yet. Find a movie on the <Link to="/" className="underline">home page</Link> to get started.
            </div>
          ) : (
            <ul className="divide-y">
              {bookings!.map((b) => (
                <li key={b.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      Ref: {b.booking_reference}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Status: {b.booking_status} • Amount: ₹{b.final_amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {b.created_at ? new Date(b.created_at).toLocaleString() : ''}
                      {b.show_id ? ` • Show #${b.show_id}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100">{b.booking_type}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
