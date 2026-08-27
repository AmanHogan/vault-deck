import { useEffect, useState } from 'react'
import SkillsPageComp from '../components/skills-page'
import type { Skill } from '@/types/types'
import { JsonTransferBar } from '@/components/json-transfer-bar'
import { sanitizeForDb } from '@/lib/import-sanitize'

export default function SkillsPage() {
  const [data, setData] = useState<Skill[] | null>(null)
  const [importKey, setImportKey] = useState(0)

  async function reload() {
    const d = await window.api.skills.getAll()
    setData(d as Skill[])
  }

  useEffect(() => { reload() }, [])

  async function handleExport() {
    const records = await window.api.skills.getAll()
    const json = JSON.stringify(
      { type: 'skills', version: 1, exportedAt: new Date().toISOString(), records },
      null, 2
    )
    await window.api.data.saveJson('skills-export.json', json)
  }

  async function handleImport(records: unknown[]) {
    for (const rec of records) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = rec as Record<string, unknown>
      await window.api.skills.create(sanitizeForDb(payload))
    }
    await reload()
    setImportKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
        <p className="text-sm text-muted-foreground">Log and organize your skills by proficiency level.</p>
      </div>
      {data && (
        <JsonTransferBar
          label="Skills"
          recordCount={data.length}
          dataType="skills"
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
      {!data ? <p className="text-muted-foreground text-sm">Loading...</p> : <SkillsPageComp key={importKey} initialSkills={data} />}
    </div>
  )
}
