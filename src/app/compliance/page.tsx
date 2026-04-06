'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Download, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { format } from 'date-fns'

interface Branch {
  id: string
  name: string
  code: string
}

export default function CompliancePage() {
  const { user } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState<string>('')
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => {
        const list: Branch[] = j.branches ?? []
        setBranches(list)
        if (list.length > 0) {
          setBranchId((prev) => prev || list[0].id)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDownload(report: 'pt27' | 'pt28') {
    if (!branchId || !month) return
    setDownloading(report)
    try {
      const params = new URLSearchParams({ month, branchId })
      const res = await fetch(`/api/compliance/${report}?${params.toString()}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.toUpperCase()}-${month}-${branchId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  if (user && user.role === 'staff') {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Access restricted to managers and administrators.
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thai cannabis regulatory reports (PT.27 &amp; PT.28)
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {branches.length > 0 && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Report Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">PT.27 — Acquisition Report</span>
                <Badge variant="outline">Monthly</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Records all cannabis received (purchased) at the selected branch during the month.
              </p>
              <Button
                onClick={() => handleDownload('pt27')}
                disabled={!branchId || !month || downloading === 'pt27'}
                className="w-full"
              >
                {downloading === 'pt27' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PT.27 (.xlsx)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">PT.28 — Dispensing Report</span>
                <Badge variant="outline">Monthly</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Records all cannabis dispensed (sold) at the selected branch during the month.
              </p>
              <Button
                onClick={() => handleDownload('pt28')}
                disabled={!branchId || !month || downloading === 'pt28'}
                className="w-full"
              >
                {downloading === 'pt28' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PT.28 (.xlsx)
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              Reports are generated from your transaction and purchase data. Ensure all purchases are
              marked as &quot;received&quot; and all transactions are &quot;completed&quot; before generating reports for
              submission.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
