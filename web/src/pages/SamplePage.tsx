import { useState } from 'react'
import {
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../UI'
import Header from '../components/header'

export default function SamplePage() {
  const [city, setCity] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-2xl font-bold text-[color:var(--color-secondary-900)]">UI Sample</h1>
      <Header />
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="info">Info</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button>Medium</Button>
            <Button size="lg">Large</Button>
            <Button
              onClick={() => {
                setIsLoading(true)
                setTimeout(() => setIsLoading(false), 1200)
              }}
            >
              {isLoading ? <Spinner size={16} /> : 'With Spinner'}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Badge>Interactive footer</Badge>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="name"
            label="Name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="Enter your full name"
          />
          <Select
            name="city"
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            helperText="Choose your city"
          >
            <option value="" disabled>
              Select city
            </option>
            <option value="mum">Mumbai</option>
            <option value="blr">Bengaluru</option>
            <option value="del">Delhi</option>
          </Select>
          <Input
            name="email"
            type="email"
            label="Email (error state)"
            placeholder="you@example.com"
            error="Invalid email address"
          />
        </CardContent>
        <CardFooter>
          <Button variant="primary">Submit</Button>
          <Button variant="outline">Cancel</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges & Spinner</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="info">Info</Badge>
          <div className="ml-4 inline-flex items-center gap-2">
            <Spinner />
            <span className="text-sm text-[color:var(--color-secondary-700)]">Loading state</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}