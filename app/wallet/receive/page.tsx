'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import  app  from '../../../lib/firebase'
import { useRouter } from 'next/navigation'

export default function ReceivePage() {
  const [uid, setUid] = useState('')
  const router = useRouter()

  useEffect(() => {
    const auth = getAuth(app)
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
      } else {
        setUid(user.uid)
      }
    })
    return () => unsub()
  }, [])

  if (!uid) return <div>Loading...</div>

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>Receive Token</h1>

      <p>Scan this QR to send you tokens</p>

      <div style={{ margin: 20 }}>
        <QRCodeSVG value={uid} size={220} />
      </div>

      <p style={{ marginTop: 10, fontSize: 12 }}>
        UID: {uid}
      </p>

      <button
        onClick={() => router.push('/wallet')}
        style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 10,
          background: '#111',
          color: '#fff'
        }}
      >
        Back to Wallet
      </button>
    </div>
  )
}