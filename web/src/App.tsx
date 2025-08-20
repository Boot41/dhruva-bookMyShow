import { Routes, Route } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage'
import SamplePage from './pages/SamplePage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/samplePage" element={<SamplePage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  )
}
