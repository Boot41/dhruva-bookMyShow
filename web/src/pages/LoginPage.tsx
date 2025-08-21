import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../UI'
import { login, getMe, ApiError, type LoginRequest } from '../Api/LoginAPI'
import { useAppStore } from '../store'

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<LoginRequest>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string>('')
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)

  const handleInputChange = (field: keyof LoginRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    // Clear general login error
    if (loginError) {
      setLoginError('')
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginRequest> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setLoginError('')

    try {
      const tokenResponse = await login(formData)
      
      // Store token
      localStorage.setItem('access_token', tokenResponse.access_token)

      // Fetch current user and store in global state
      try {
        const me = await getMe(tokenResponse.access_token)
        setUser({
          token: tokenResponse,
          email: me.email,
          id: me.id,
          first_name: me.first_name,
          last_name: me.last_name,
        })
      } catch (e) {
        // Fallback: store token and email only
        setUser({ token: tokenResponse, email: formData.email })
      }

      // Navigate to home page after successful login
      console.log('Login successful:', tokenResponse)
      navigate('/')
      
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setLoginError('Invalid email or password. Please try again.')
        } else {
          setLoginError(error.message || 'Login failed. Please try again.')
        }
      } else {
        setLoginError('Network error. Please check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(135deg, var(--color-secondary-900) 0%, var(--color-secondary-800) 100%)',
      }}
    >
      <div className="w-[28rem] max-w-full shrink-0 text-left">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" 
              style={{ color: 'var(--color-primary-500)', fontFamily: 'var(--font-display)' }}>
            BookMyShow
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-secondary-300)' }}>
            Sign in to your account
          </p>
        </div>

        <Card className="text-left">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* General Login Error */}
              {loginError && (
                <div className="alert alert-primary">
                  {loginError}
                </div>
              )}

              {/* Email Input */}
              <Input
                type="email"
                name="email"
                label="Email Address"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={errors.email}
                disabled={isLoading}
                autoComplete="email"
                required
              />

              {/* Password Input */}
              <Input
                type="password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="btn-block mt-6"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              {/* Additional Links */}
              <div className="text-center mt-4 space-y-2">
                <a
                  href="#forgot-password"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-accent-blue)' }}
                >
                  Forgot your password?
                </a>
                <div className="text-sm" style={{ color: 'var(--color-secondary-500)' }}>
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="hover:underline"
                    style={{ color: 'var(--color-primary-500)' }}
                  >
                    Sign up here
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs" style={{ color: 'var(--color-secondary-400)' }}>
          © 2024 BookMyShow. All rights reserved.
        </div>
      </div>
    </div>
  )
}
