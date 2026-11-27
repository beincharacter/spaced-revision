import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          fontSize: 210,
          fontWeight: 700,
          letterSpacing: '-5px',
        }}
      >
        RF
      </div>
    ),
    { width: 512, height: 512 }
  )
}
