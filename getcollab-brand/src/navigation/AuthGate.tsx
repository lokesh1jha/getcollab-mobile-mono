import React from 'react'
import { TermsAcceptanceModal } from '../components/TermsAcceptanceModal'
import { useAuthRedirect } from './useAuthRedirect'

export function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthRedirect()
  return (
    <>
      {children}
      <TermsAcceptanceModal />
    </>
  )
}
