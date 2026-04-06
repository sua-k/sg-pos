'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Settings2, RefreshCw, CheckCircle2, XCircle, Loader2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface SyncLog {
  id: string
  entityType: string
  entityId: string
  direction: string
  status: string
  errorMsg: string | null
  syncedAt: string
}

function ZohoPageInner() {
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [syncingInventory, setSyncingInventory] = useState(false)
  const [syncingBooks, setSyncingBooks] = useState(false)
  const [syncingBank, setSyncingBank] = useState(false)

  const connected = searchParams.get('connected') === '1'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (connected) toast.success('Zoho connected successfully!')
    if (errorParam) toast.error(`Zoho connection error: ${errorParam}`)
  }, [connected, errorParam])

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/zoho/sync/logs?take=20')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? [])
      }
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  async function runSync(type: 'inventory' | 'books' | 'bank') {
    const setLoading =
      type === 'inventory' ? setSyncingInventory : type === 'books' ? setSyncingBooks : setSyncingBank

    setLoading(true)
    try {
      const res = await fetch(`/api/zoho/sync/${type}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message ?? `${type} sync complete`)
        fetchLogs()
      } else {
        toast.error(data.error ?? `${type} sync failed`)
      }
    } catch {
      toast.error(`${type} sync failed`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Zoho Integration</h1>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Connect SG POS to your Zoho organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {connected ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {connected ? 'Connected to Zoho' : 'Not connected'}
              </span>
            </div>
            <Button asChild className="min-h-[44px]">
              <a href="/api/zoho/auth">
                <Link2 className="h-4 w-4 mr-2" />
                {connected ? 'Reconnect to Zoho' : 'Connect to Zoho'}
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Manual Sync */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Sync</CardTitle>
            <CardDescription>Trigger individual sync operations manually</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => runSync('inventory')}
                disabled={syncingInventory}
              >
                {syncingInventory ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Inventory
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => runSync('books')}
                disabled={syncingBooks}
              >
                {syncingBooks ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Books
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => runSync('bank')}
                disabled={syncingBank}
              >
                {syncingBank ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Bank
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sync Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Log</CardTitle>
            <CardDescription>Audit trail of sync operations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No sync logs yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium capitalize">
                        {log.entityType}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.direction}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === 'success'
                              ? 'default'
                              : log.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.errorMsg ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.syncedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

export default function ZohoPage() {
  return (
    <Suspense fallback={null}>
      <ZohoPageInner />
    </Suspense>
  )
}
