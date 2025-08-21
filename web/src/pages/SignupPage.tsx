import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../UI'
import { register, type RegisterRequest } from '../Api/RegisterAPI'
import { login, ApiError } from '../Api/LoginAPI'
import { useAppStore } from '../store'

export default function SignupPage() {
  const [formData, setFormData] = useState<RegisterRequest & { confirm_password: string }>({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')
  const [submitSuccess, setSubmitSuccess] = useState<string>('')
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
    if (submitError) setSubmitError('')
    if (submitSuccess) setSubmitSuccess('')
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {}

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'

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

    if (formData.confirm_password !== formData.password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setSubmitError('')

    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
      })

      // Auto-login after successful registration
      try {
        const tokenResponse = await login({ email: formData.email, password: formData.password })
        localStorage.setItem('access_token', tokenResponse.access_token)
        setUser({ token: tokenResponse, email: formData.email })
        navigate('/')
        return
      } catch (e: unknown) {
        // Registration succeeded but auto-login failed
        setSubmitSuccess('Account created. Please sign in to continue.')
        navigate('/login')
        return
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || 'Registration failed. Please try again.')
      } else {
        setSubmitError('Network error. Please try again.')
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
      <div className="w-[32rem] max-w-full shrink-0 text-left">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--color-primary-500)', fontFamily: 'var(--font-display)' }}
          >
            BookMyShow
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-secondary-300)' }}>
            Create your account
          </p>
        </div>

        <Card className="text-left">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && <div className="alert alert-primary">{submitError}</div>}
              {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="text"
                  name="first_name"
                  label="First Name"
                  placeholder="First name"
                  value={formData.first_name}
                  onChange={handleInputChange('first_name')}
                  error={errors.first_name}
                  disabled={isLoading}
                  required
                />
                <Input
                  type="text"
                  name="last_name"
                  label="Last Name"
                  placeholder="Last name"
                  value={formData.last_name}
                  onChange={handleInputChange('last_name')}
                  error={errors.last_name}
                  disabled={isLoading}
                  required
                />
              </div>

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

              <Input
                type="tel"
                name="phone"
                label="Phone Number (optional)"
                placeholder="Enter your phone"
                value={formData.phone ?? ''}
                onChange={handleInputChange('phone')}
                error={errors.phone}
                disabled={isLoading}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="password"
                  name="password"
                  label="Password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={errors.password}
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />
                <Input
                  type="password"
                  name="confirm_password"
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={formData.confirm_password}
                  onChange={handleInputChange('confirm_password')}
                  error={errors.confirm_password}
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="btn-block mt-6"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center mt-4 text-sm" style={{ color: 'var(--color-secondary-500)' }}>
                Already have an account?{' '}
                <Link to="/login" className="hover:underline" style={{ color: 'var(--color-primary-500)' }}>
                  Sign in here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs" style={{ color: 'var(--color-secondary-400)' }}>
          © 2024 BookMyShow. All rights reserved.
        </div>
      </div>
    </div>
  )
}
