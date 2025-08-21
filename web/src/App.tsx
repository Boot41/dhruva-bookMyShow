import { Routes, Route } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage'
import SamplePage from './pages/SamplePage'
import LoginPage from './pages/LoginPage'
import BookTicketsPage from './pages/BookTicketsPage'
import SeatsPage from './pages/SeatsPage'
import BookingSummaryPage from './pages/BookingSummaryPage'
import SignupPage from './pages/SignupPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/samplePage" element={<SamplePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/book" element={<BookTicketsPage />} />
      <Route path="/seats" element={<SeatsPage />} />
      <Route path="/summary" element={<BookingSummaryPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  )
}
