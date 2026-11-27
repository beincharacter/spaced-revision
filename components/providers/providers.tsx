'use client'
import { Toaster } from 'sonner'
import { ServiceWorkerRegistration } from './service-worker-registration'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton expand={false} />
      <ServiceWorkerRegistration />
    </>
  )
}
