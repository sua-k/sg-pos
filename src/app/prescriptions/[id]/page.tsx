'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface PrescriptionDetail {
  id: string
  prescriptionNo: string
  issuedDate: string
  expiryDate: string
  totalAllowedG: number | null
  consumedG: number
  remainingG: number | null
  dailyDosageG: string | null
  numDays: number | null
  diagnosis: string | null
  notes: string | null
  customer: {
    id: string
    name: string | null
    idNumber: string
    idType: string
    dateOfBirth: string
    nationality: string | null
  }
  prescriber: { id: string; name: string; licenseNo: string | null } | null
  branch: { id: string; name: string; code: string }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

export default function PrescriptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [rx, setRx] = useState<PrescriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/prescriptions/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then(setRx)
      .catch(() => setError('Prescription not found'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </AppShell>
    )
  }

  if (error || !rx) {
    return (
      <AppShell>
        <div className="text-center py-24 text-muted-foreground">
          <p>{error ?? 'Prescription not found'}</p>
          <Button variant="ghost" className="mt-4" onClick={() => router.push('/prescriptions')}>
            Back to Prescriptions
          </Button>
        </div>
      </AppShell>
    )
  }

  const isExpired = new Date(rx.expiryDate) < new Date()

  return (
    <AppShell>
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {rx.prescriptionNo}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {isExpired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
              )}
              <Badge variant="outline" className="font-mono text-xs">{rx.branch.code}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InfoRow label="Name" value={rx.customer.name} />
              <InfoRow label="ID Number" value={<span className="font-mono">{rx.customer.idNumber}</span>} />
              <InfoRow label="ID Type" value={rx.customer.idType} />
              <InfoRow label="Date of Birth" value={format(new Date(rx.customer.dateOfBirth), 'dd MMM yyyy')} />
              <InfoRow label="Nationality" value={rx.customer.nationality} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Prescription Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InfoRow label="Issued" value={format(new Date(rx.issuedDate), 'dd MMM yyyy')} />
              <InfoRow label="Expires" value={format(new Date(rx.expiryDate), 'dd MMM yyyy')} />
              <InfoRow label="Prescriber" value={rx.prescriber?.name} />
              {rx.prescriber?.licenseNo && (
                <InfoRow label="License No." value={<span className="font-mono">{rx.prescriber.licenseNo}</span>} />
              )}
              <InfoRow label="Branch" value={rx.branch.name} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dosage &amp; Usage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow
              label="Total Allowed"
              value={rx.totalAllowedG !== null ? `${rx.totalAllowedG}g` : null}
            />
            <InfoRow label="Consumed" value={`${rx.consumedG}g`} />
            <InfoRow
              label="Remaining"
              value={rx.remainingG !== null ? `${rx.remainingG.toFixed(2)}g` : null}
            />
            {rx.dailyDosageG && (
              <InfoRow label="Daily Dosage" value={`${rx.dailyDosageG}g`} />
            )}
            {rx.numDays && (
              <InfoRow label="Duration" value={`${rx.numDays} days`} />
            )}
          </CardContent>
        </Card>

        {(rx.diagnosis || rx.notes) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {rx.diagnosis && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                  <p className="text-sm">{rx.diagnosis}</p>
                </div>
              )}
              {rx.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{rx.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
