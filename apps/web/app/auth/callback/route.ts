import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Reconstruct the public origin from HTTP headers (forwarded by Nginx)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'eduboard.online'
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https')
  const origin = `${proto}://${host}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

