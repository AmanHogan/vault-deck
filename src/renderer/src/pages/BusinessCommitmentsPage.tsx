import { useEffect, useState } from 'react'
import BusinessCommitmentsComp from '../components/bcomm-page'
import type { BusinessCommitmentOne } from '@/types/types'
import { JsonTransferBar } from '@/components/json-transfer-bar'
import { sanitizeForDb } from '@/lib/import-sanitize'

export default function BusinessCommitmentsPage() {
  const [data, setData] = useState<BusinessCommitmentOne[] | null>(null)
  const [importKey, setImportKey] = useState(0)

  async function reload() {
    const d = await window.api.bcomm1.getAll()
    setData(d as BusinessCommitmentOne[])
  }

  useEffect(() => { reload() }, [])

  async function handleExport() {
    const records = await window.api.bcomm1.getAll()
    const json = JSON.stringify(
      { type: 'bcomm1', version: 1, exportedAt: new Date().toISOString(), records },
      null, 2
    )
    await window.api.data.saveJson('bcomm1-export.json', json)
  }

  async function handleImport(records: unknown[]) {
    for (const rec of records) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _c, ...payload } = rec as Record<string, unknown>
      await window.api.bcomm1.create(sanitizeForDb(payload))
    }
    await reload()
    setImportKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Work Impact</h1>
        <p className="text-sm text-muted-foreground">Track work items and the value they deliver.</p>
      </div>
      {data && (
        <JsonTransferBar
          label="Work Impact"
          recordCount={data.length}
          dataType="bcomm1"
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
      {!data ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <BusinessCommitmentsComp key={importKey} initialCommitments={data} />
      )}
    </div>
  )
}
