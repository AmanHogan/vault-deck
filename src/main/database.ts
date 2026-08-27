import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

const db = new Database(join(app.getPath('userData'), 'workspace.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS business_commitments_one (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workItem TEXT NOT NULL,
    started TEXT,
    dateCompleted TEXT,
    applicationContext TEXT,
    description TEXT,
    problemOpportunity TEXT,
    whoBenefited TEXT,
    impact TEXT,
    valueCategories TEXT DEFAULT '[]',
    improvedOutcomes INTEGER DEFAULT 0,
    improvedOutcomesText TEXT,
    increasedEfficiency INTEGER DEFAULT 0,
    increasedEfficiencyText TEXT,
    reducedRiskCost INTEGER DEFAULT 0,
    reducedRiskCostText TEXT,
    enhancedCustomerExperience INTEGER DEFAULT 0,
    enhancedCustomerExperienceText TEXT,
    enhancedEmployeeExperience INTEGER DEFAULT 0,
    enhancedEmployeeExperienceText TEXT,
    alignment TEXT,
    statusNotes TEXT,
    status TEXT DEFAULT 'IN_PROGRESS',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS development_commitments_one (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemName TEXT NOT NULL,
    description TEXT,
    itemDate TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    selfAssessment TEXT DEFAULT '',
    rating INTEGER DEFAULT 0,
    updatedAt TEXT DEFAULT (datetime('now')),
    UNIQUE(type, category)
  );

  CREATE TABLE IF NOT EXISTS quick_accomplishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    dateFinished TEXT,
    status TEXT DEFAULT 'Completed',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS learning_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemId INTEGER NOT NULL REFERENCES development_commitments_one(id) ON DELETE CASCADE,
    moduleName TEXT NOT NULL,
    type TEXT,
    hours REAL,
    dateStarted TEXT,
    dateFinished TEXT,
    finished INTEGER DEFAULT 0,
    required INTEGER DEFAULT 0,
    description TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS one_on_ones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documentDate TEXT NOT NULL,
    businessPartnerWork TEXT,
    workloadConcerns TEXT,
    tdpContributions TEXT,
    utilizationPercentage REAL,
    trainingSkills TEXT,
    pursuingDegrees TEXT,
    compliancePercentage REAL,
    ehsTrainingPercentage REAL,
    growthHubProgress TEXT,
    successPathwaysUpdated INTEGER DEFAULT 0,
    contingencyTrainingPercentage REAL,
    innovationEvents TEXT,
    accomplishments TEXT,
    challenges TEXT,
    goals TEXT,
    questions TEXT,
    receivingSupport TEXT,
    additionalItems TEXT,
    outOfOfficePlans TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS action_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    criticality TEXT,
    dateStarted TEXT,
    dateFinished TEXT,
    dueDate TEXT,
    dueTime TEXT,
    completed INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    proficiency INTEGER NOT NULL DEFAULT 3,
    date TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flash_card_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    topic TEXT,
    ownerId TEXT,
    tags TEXT DEFAULT '[]',
    timesStudied INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flash_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setId INTEGER NOT NULL REFERENCES flash_card_sets(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    sortOrder INTEGER DEFAULT 0,
    groupName TEXT,
    termImageUrl TEXT,
    definitionImageUrl TEXT,
    hint TEXT,
    starred INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fc_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    proficiency INTEGER NOT NULL DEFAULT 3,
    date TEXT,
    flashCardSetId INTEGER REFERENCES flash_card_sets(id) ON DELETE SET NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS image_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    label TEXT,
    uploadedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resume_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    label TEXT,
    uploadedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS note_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL REFERENCES note_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );
`)

// Migrate existing tables — safe to run every start (errors are swallowed)
try { db.exec("ALTER TABLE skills ADD COLUMN tags TEXT DEFAULT '[]'") } catch { /* already exists */ }
try { db.exec("ALTER TABLE action_items ADD COLUMN dueDate TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE action_items ADD COLUMN dueTime TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE action_items ADD COLUMN reminderSnoozedUntil TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE business_commitments_two ADD COLUMN applicationContext TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE business_commitments_two ADD COLUMN impact TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE development_commitments_two ADD COLUMN applicationContext TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE development_commitments_two ADD COLUMN impact TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE development_commitments_one ADD COLUMN description TEXT") } catch { /* already exists */ }
try { db.exec("ALTER TABLE development_commitments_one ADD COLUMN done INTEGER DEFAULT 0") } catch { /* already exists */ }
try { db.exec("ALTER TABLE development_commitments_one ADD COLUMN hours REAL") } catch { /* already exists */ }
try { db.exec("ALTER TABLE development_commitments_one ADD COLUMN tags TEXT DEFAULT '[]'") } catch { /* already exists */ }

// NOTE: 'finished' is intentionally NOT a global boolean column. In
// learning_modules it is a boolean flag, but in development_commitments_two,
// business_commitments_two, event_sub_items, and sub_events it is a date
// (TEXT) column. Treating it as a global bool corrupted those dates on read.
// Use MODULE_BOOL_COLS for learning_modules reads where it really is a bool.
const BOOL_COLS = new Set([
  'improvedOutcomes', 'increasedEfficiency', 'reducedRiskCost',
  'enhancedCustomerExperience', 'enhancedEmployeeExperience',
  'required', 'done', 'completed', 'successPathwaysUpdated', 'starred'
])

const MODULE_BOOL_COLS = new Set([...BOOL_COLS, 'finished'])

const JSON_COLS = new Set(['valueCategories', 'tags'])

function normalize(row: Record<string, unknown>, boolCols: Set<string> = BOOL_COLS): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (boolCols.has(k)) {
      out[k] = v === 1
    } else if (JSON_COLS.has(k) && typeof v === 'string') {
      try { out[k] = JSON.parse(v) } catch { out[k] = [] }
    } else {
      out[k] = v
    }
  }
  return out
}

function normalizeAll(rows: Record<string, unknown>[], boolCols: Set<string> = BOOL_COLS): Record<string, unknown>[] {
  return rows.map((r) => normalize(r, boolCols))
}

// Sanitize an incoming payload so every boolean becomes 0/1 and every
// undefined becomes null before anything is passed to better-sqlite3.
// better-sqlite3's C++ binder only accepts number/string/bigint/Buffer/null —
// JS booleans are explicitly NOT on that list and throw at runtime.
function sanitize(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'boolean') out[k] = v ? 1 : 0
    else if (v === undefined) out[k] = null
    else out[k] = v
  }
  return out
}

// Keep for compatibility — callers that pass a raw value (not via sanitize)
function boolInt(v: unknown): number {
  return v ? 1 : 0
}

// ─── Business Commitments One ─────────────────────────────────────────────────

export const bcomm1 = {
  getAll: () => normalizeAll(db.prepare('SELECT * FROM business_commitments_one ORDER BY createdAt DESC').all() as Record<string, unknown>[]),
  create: (p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    const cats = JSON.stringify(Array.isArray(p.valueCategories) ? p.valueCategories : [])
    const r = db.prepare(`
      INSERT INTO business_commitments_one
        (workItem,started,dateCompleted,applicationContext,description,problemOpportunity,
         whoBenefited,impact,valueCategories,improvedOutcomes,improvedOutcomesText,
         increasedEfficiency,increasedEfficiencyText,reducedRiskCost,reducedRiskCostText,
         enhancedCustomerExperience,enhancedCustomerExperienceText,
         enhancedEmployeeExperience,enhancedEmployeeExperienceText,
         alignment,statusNotes,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(p.workItem,p.started??null,p.dateCompleted??null,p.applicationContext??null,
           p.description??null,p.problemOpportunity??null,p.whoBenefited??null,p.impact??null,
           cats,p.improvedOutcomes??0,p.improvedOutcomesText??null,
           p.increasedEfficiency??0,p.increasedEfficiencyText??null,
           p.reducedRiskCost??0,p.reducedRiskCostText??null,
           p.enhancedCustomerExperience??0,p.enhancedCustomerExperienceText??null,
           p.enhancedEmployeeExperience??0,p.enhancedEmployeeExperienceText??null,
           p.alignment??null,p.statusNotes??null,p.status??'IN_PROGRESS')
    return normalize(db.prepare('SELECT * FROM business_commitments_one WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>)
  },
  update: (id: number, p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    const cats = JSON.stringify(Array.isArray(p.valueCategories) ? p.valueCategories : [])
    db.prepare(`
      UPDATE business_commitments_one SET
        workItem=?,started=?,dateCompleted=?,applicationContext=?,description=?,
        problemOpportunity=?,whoBenefited=?,impact=?,valueCategories=?,
        improvedOutcomes=?,improvedOutcomesText=?,increasedEfficiency=?,increasedEfficiencyText=?,
        reducedRiskCost=?,reducedRiskCostText=?,enhancedCustomerExperience=?,
        enhancedCustomerExperienceText=?,enhancedEmployeeExperience=?,enhancedEmployeeExperienceText=?,
        alignment=?,statusNotes=?,status=?,updatedAt=datetime('now')
      WHERE id=?
    `).run(p.workItem,p.started??null,p.dateCompleted??null,p.applicationContext??null,
           p.description??null,p.problemOpportunity??null,p.whoBenefited??null,p.impact??null,
           cats,p.improvedOutcomes??0,p.improvedOutcomesText??null,
           p.increasedEfficiency??0,p.increasedEfficiencyText??null,
           p.reducedRiskCost??0,p.reducedRiskCostText??null,
           p.enhancedCustomerExperience??0,p.enhancedCustomerExperienceText??null,
           p.enhancedEmployeeExperience??0,p.enhancedEmployeeExperienceText??null,
           p.alignment??null,p.statusNotes??null,p.status??'IN_PROGRESS',id)
    return normalize(db.prepare('SELECT * FROM business_commitments_one WHERE id=?').get(id) as Record<string, unknown>)
  },
  delete: (id: number) => { db.prepare('DELETE FROM business_commitments_one WHERE id=?').run(id) }
}

// ─── Development Commitments One ─────────────────────────────────────────────

// Selects a learning item plus aggregates over its modules so the table can
// show module count + summed hours without separately loading every module.
const DCOMM1_SELECT = `
  SELECT d.*,
    (SELECT COUNT(*) FROM learning_modules m WHERE m.itemId = d.id) AS moduleCount,
    (SELECT COALESCE(SUM(m.hours), 0) FROM learning_modules m WHERE m.itemId = d.id) AS moduleHours
  FROM development_commitments_one d
`

export const dcomm1 = {
  getAll: () => normalizeAll(db.prepare(`${DCOMM1_SELECT} ORDER BY d.createdAt DESC`).all() as Record<string, unknown>[]),
  create: (p: Record<string, unknown>) => {
    const r = db.prepare('INSERT INTO development_commitments_one (itemName,description,itemDate,done,hours,tags) VALUES (?,?,?,?,?,?)').run(p.itemName, p.description??null, p.itemDate??null, boolInt(p.done), p.hours??null, JSON.stringify(p.tags ?? []))
    return normalize(db.prepare(`${DCOMM1_SELECT} WHERE d.id=?`).get(r.lastInsertRowid) as Record<string, unknown>)
  },
  update: (id: number, p: Record<string, unknown>) => {
    db.prepare("UPDATE development_commitments_one SET itemName=?,description=?,itemDate=?,done=?,hours=?,tags=?,updatedAt=datetime('now') WHERE id=?").run(p.itemName, p.description??null, p.itemDate??null, boolInt(p.done), p.hours??null, JSON.stringify(p.tags ?? []), id)
    return normalize(db.prepare(`${DCOMM1_SELECT} WHERE d.id=?`).get(id) as Record<string, unknown>)
  },
  delete: (id: number) => { db.prepare('DELETE FROM development_commitments_one WHERE id=?').run(id) },
  getModules: (itemId: number) => normalizeAll(db.prepare('SELECT * FROM learning_modules WHERE itemId=? ORDER BY createdAt ASC').all(itemId) as Record<string, unknown>[], MODULE_BOOL_COLS),
  createModule: (itemId: number, p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    const r = db.prepare(`
      INSERT INTO learning_modules (itemId,moduleName,type,hours,dateStarted,dateFinished,finished,required,description)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(itemId,p.moduleName,p.type??null,p.hours??null,p.dateStarted??null,p.dateFinished??null,p.finished??0,p.required??0,p.description??null)
    return normalize(db.prepare('SELECT * FROM learning_modules WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>, MODULE_BOOL_COLS)
  },
  updateModule: (moduleId: number, p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    db.prepare(`UPDATE learning_modules SET moduleName=?,type=?,hours=?,dateStarted=?,dateFinished=?,finished=?,required=?,description=?,updatedAt=datetime('now') WHERE id=?`)
      .run(p.moduleName,p.type??null,p.hours??null,p.dateStarted??null,p.dateFinished??null,p.finished??0,p.required??0,p.description??null,moduleId)
    return normalize(db.prepare('SELECT * FROM learning_modules WHERE id=?').get(moduleId) as Record<string, unknown>, MODULE_BOOL_COLS)
  },
  deleteModule: (moduleId: number) => { db.prepare('DELETE FROM learning_modules WHERE id=?').run(moduleId) }
}

// ─── One on One ───────────────────────────────────────────────────────────────

export const oneOnOne = {
  getAll: () => normalizeAll(db.prepare('SELECT * FROM one_on_ones ORDER BY documentDate DESC').all() as Record<string, unknown>[]),
  create: (p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    const r = db.prepare(`
      INSERT INTO one_on_ones (documentDate,businessPartnerWork,workloadConcerns,tdpContributions,
        utilizationPercentage,trainingSkills,pursuingDegrees,compliancePercentage,ehsTrainingPercentage,
        growthHubProgress,successPathwaysUpdated,contingencyTrainingPercentage,innovationEvents,
        accomplishments,challenges,goals,questions,receivingSupport,additionalItems,outOfOfficePlans)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(p.documentDate,p.businessPartnerWork??null,p.workloadConcerns??null,p.tdpContributions??null,
           p.utilizationPercentage??null,p.trainingSkills??null,p.pursuingDegrees??null,
           p.compliancePercentage??null,p.ehsTrainingPercentage??null,p.growthHubProgress??null,
           p.successPathwaysUpdated??0,p.contingencyTrainingPercentage??null,p.innovationEvents??null,
           p.accomplishments??null,p.challenges??null,p.goals??null,p.questions??null,
           p.receivingSupport??null,p.additionalItems??null,p.outOfOfficePlans??null)
    return normalize(db.prepare('SELECT * FROM one_on_ones WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>)
  },
  update: (id: number, p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    db.prepare(`
      UPDATE one_on_ones SET documentDate=?,businessPartnerWork=?,workloadConcerns=?,tdpContributions=?,
        utilizationPercentage=?,trainingSkills=?,pursuingDegrees=?,compliancePercentage=?,ehsTrainingPercentage=?,
        growthHubProgress=?,successPathwaysUpdated=?,contingencyTrainingPercentage=?,innovationEvents=?,
        accomplishments=?,challenges=?,goals=?,questions=?,receivingSupport=?,additionalItems=?,outOfOfficePlans=?,
        updatedAt=datetime('now')
      WHERE id=?
    `).run(p.documentDate,p.businessPartnerWork??null,p.workloadConcerns??null,p.tdpContributions??null,
           p.utilizationPercentage??null,p.trainingSkills??null,p.pursuingDegrees??null,
           p.compliancePercentage??null,p.ehsTrainingPercentage??null,p.growthHubProgress??null,
           p.successPathwaysUpdated??0,p.contingencyTrainingPercentage??null,p.innovationEvents??null,
           p.accomplishments??null,p.challenges??null,p.goals??null,p.questions??null,
           p.receivingSupport??null,p.additionalItems??null,p.outOfOfficePlans??null,id)
    return normalize(db.prepare('SELECT * FROM one_on_ones WHERE id=?').get(id) as Record<string, unknown>)
  },
  delete: (id: number) => { db.prepare('DELETE FROM one_on_ones WHERE id=?').run(id) }
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export const actionItems = {
  getAll: () => normalizeAll(db.prepare('SELECT * FROM action_items ORDER BY createdAt DESC').all() as Record<string, unknown>[]),
  create: (p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    const r = db.prepare('INSERT INTO action_items (name,description,criticality,dateStarted,dateFinished,dueDate,dueTime,completed) VALUES (?,?,?,?,?,?,?,?)').run(p.name,p.description??null,p.criticality??null,p.dateStarted??null,p.dateFinished??null,p.dueDate??null,p.dueTime??null,p.completed??0)
    return normalize(db.prepare('SELECT * FROM action_items WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>)
  },
  update: (id: number, p_raw: Record<string, unknown>) => {
    const p = sanitize(p_raw)
    db.prepare("UPDATE action_items SET name=?,description=?,criticality=?,dateStarted=?,dateFinished=?,dueDate=?,dueTime=?,completed=?,updatedAt=datetime('now') WHERE id=?").run(p.name,p.description??null,p.criticality??null,p.dateStarted??null,p.dateFinished??null,p.dueDate??null,p.dueTime??null,p.completed??0,id)
    return normalize(db.prepare('SELECT * FROM action_items WHERE id=?').get(id) as Record<string, unknown>)
  },
  delete: (id: number) => { db.prepare('DELETE FROM action_items WHERE id=?').run(id) },
  getOverdue: () => {
    const today = new Date().toISOString().slice(0, 10)
    return normalizeAll(db.prepare("SELECT * FROM action_items WHERE completed=0 AND dueDate IS NOT NULL AND dueDate <= ?").all(today) as Record<string, unknown>[])
  },
  getDueItems: () => {
    // Returns all uncompleted items that have a dueDate (today or future within 1 hour)
    const soon = new Date(Date.now() + 65 * 60 * 1000).toISOString().slice(0, 10)
    return normalizeAll(db.prepare("SELECT * FROM action_items WHERE completed=0 AND dueDate IS NOT NULL AND dueDate <= ?").all(soon) as Record<string, unknown>[])
  },
  getUpcoming: () => {
    // All uncompleted items with a dueDate, sorted soonest first — used for startup briefing
    return normalizeAll(db.prepare(
      "SELECT * FROM action_items WHERE completed=0 AND dueDate IS NOT NULL ORDER BY dueDate ASC, dueTime ASC"
    ).all() as Record<string, unknown>[])
  },
  snooze: (id: number, until: string) => {
    db.prepare("UPDATE action_items SET reminderSnoozedUntil=? WHERE id=?").run(until, id)
  },
  dismissReminder: (id: number) => {
    // Snooze until end of today so it stops firing, but resets tomorrow
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    db.prepare("UPDATE action_items SET reminderSnoozedUntil=? WHERE id=?").run(endOfDay.toISOString(), id)
  }
}

// ─── Flash Card Sets ──────────────────────────────────────────────────────────

export const fcSets = {
  getAll: () => {
    const rows = db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM flash_cards WHERE setId = s.id) as cardCount
      FROM flash_card_sets s ORDER BY s.createdAt DESC
    `).all() as Record<string, unknown>[]
    return rows.map(r => ({ ...normalize(r), flashCards: [] }))
  },
  get: (id: number) => {
    const set = normalize(db.prepare('SELECT * FROM flash_card_sets WHERE id=?').get(id) as Record<string, unknown>)
    const flashCards = normalizeAll(db.prepare('SELECT * FROM flash_cards WHERE setId=? ORDER BY sortOrder ASC').all(id) as Record<string, unknown>[])
    return { ...set, flashCards }
  },
  create: (p: Record<string, unknown>) => {
    const r = db.prepare('INSERT INTO flash_card_sets (title,description,topic,ownerId,tags) VALUES (?,?,?,?,?)').run(p.title, p.description??null, p.topic??null, p.ownerId??null, JSON.stringify(p.tags ?? []))
    return normalize(db.prepare('SELECT * FROM flash_card_sets WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>)
  },
  update: (id: number, p: Record<string, unknown>) => {
    db.prepare("UPDATE flash_card_sets SET title=?,description=?,topic=?,tags=?,updatedAt=datetime('now') WHERE id=?").run(p.title, p.description??null, p.topic??null, JSON.stringify(p.tags ?? []), id)
    return normalize(db.prepare('SELECT * FROM flash_card_sets WHERE id=?').get(id) as Record<string, unknown>)
  },
  delete: (id: number) => { db.prepare('DELETE FROM flash_card_sets WHERE id=?').run(id) },
  study: (id: number) => {
    db.prepare("UPDATE flash_card_sets SET timesStudied=timesStudied+1,updatedAt=datetime('now') WHERE id=?").run(id)
    return normalize(db.prepare('SELECT * FROM flash_card_sets WHERE id=?').get(id) as Record<string, unknown>)
  }
}

// ─── Flash Cards ──────────────────────────────────────────────────────────────

export const fcCards = {
  list: (setId: number) => normalizeAll(db.prepare('SELECT * FROM flash_cards WHERE setId=? ORDER BY sortOrder ASC').all(setId) as Record<string, unknown>[]),
  create: (setId: number, p: Record<string, unknown>) => {
    const r = db.prepare('INSERT INTO flash_cards (setId,term,definition,sortOrder,groupName,termImageUrl,definitionImageUrl,hint,starred) VALUES (?,?,?,?,?,?,?,?,?)').run(setId, p.term, p.definition, p.sortOrder??0, p.groupName??null, p.termImageUrl??null, p.definitionImageUrl??null, p.hint??null, boolInt(p.starred))
    return normalize(db.prepare('SELECT * FROM flash_cards WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>)
  },
  createBulk: (setId: number, cards: Record<string, unknown>[]) => {
    const stmt = db.prepare('INSERT INTO flash_cards (setId,term,definition,sortOrder,groupName,hint,starred) VALUES (?,?,?,?,?,?,?)')
    const insertMany = db.transaction((cs: Record<string, unknown>[]) => cs.map(c => {
      const r = stmt.run(setId, c.term, c.definition, c.sortOrder??0, c.groupName??null, c.hint??null, 0)
      return normalize(db.prepare('SELECT * FROM flash_cards WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>)
    }))
    return insertMany(cards)
  },
  update: (setId: number, cardId: number, p: Record<string, unknown>) => {
    const fields: string[] = []
    const vals: unknown[] = []
    if (p.term !== undefined) { fields.push('term=?'); vals.push(p.term) }
    if (p.definition !== undefined) { fields.push('definition=?'); vals.push(p.definition) }
    if (p.sortOrder !== undefined) { fields.push('sortOrder=?'); vals.push(p.sortOrder) }
    if ('groupName' in p) { fields.push('groupName=?'); vals.push(p.groupName??null) }
    if ('hint' in p) { fields.push('hint=?'); vals.push(p.hint??null) }
    if (p.starred !== undefined) { fields.push('starred=?'); vals.push(boolInt(p.starred)) }
    if (fields.length) {
      db.prepare(`UPDATE flash_cards SET ${fields.join(',')},updatedAt=datetime('now') WHERE id=? AND setId=?`).run(...vals, cardId, setId)
    }
    return normalize(db.prepare('SELECT * FROM flash_cards WHERE id=?').get(cardId) as Record<string, unknown>)
  },
  toggleStar: (setId: number, cardId: number) => {
    db.prepare("UPDATE flash_cards SET starred=CASE WHEN starred=1 THEN 0 ELSE 1 END,updatedAt=datetime('now') WHERE id=? AND setId=?").run(cardId, setId)
    return normalize(db.prepare('SELECT * FROM flash_cards WHERE id=?').get(cardId) as Record<string, unknown>)
  },
  delete: (setId: number, cardId: number) => { db.prepare('DELETE FROM flash_cards WHERE id=? AND setId=?').run(cardId, setId) },
  getStarredGrouped: () => {
    const sets = db.prepare('SELECT id, title FROM flash_card_sets ORDER BY title ASC').all() as { id: number; title: string }[]
    return sets.map(s => ({
      set: { id: s.id, title: s.title },
      cards: normalizeAll(db.prepare('SELECT * FROM flash_cards WHERE setId=? AND starred=1 ORDER BY sortOrder ASC').all(s.id) as Record<string, unknown>[])
    })).filter(g => g.cards.length > 0)
  },
  groups: (setId: number) => {
    return (db.prepare("SELECT DISTINCT groupName FROM flash_cards WHERE setId=? AND groupName IS NOT NULL ORDER BY groupName ASC").all(setId) as { groupName: string }[]).map(r => r.groupName)
  }
}

// ─── FC Skills ────────────────────────────────────────────────────────────────

export const fcSkills = {
  list: () => {
    const rows = db.prepare(`
      SELECT fs.*, fcs.title as flashCardSetTitle
      FROM fc_skills fs LEFT JOIN flash_card_sets fcs ON fs.flashCardSetId = fcs.id
      ORDER BY fs.proficiency DESC
    `).all() as Record<string, unknown>[]
    return normalizeAll(rows)
  },
  listBySet: (setId: number) => normalizeAll(db.prepare('SELECT * FROM fc_skills WHERE flashCardSetId=? ORDER BY proficiency DESC').all(setId) as Record<string, unknown>[]),
  create: (p: Record<string, unknown>) => {
    const r = db.prepare('INSERT INTO fc_skills (name,proficiency,date,flashCardSetId) VALUES (?,?,?,?)').run(p.name, p.proficiency??3, p.date??null, p.flashCardSetId??null)
    const row = db.prepare('SELECT fs.*, fcs.title as flashCardSetTitle FROM fc_skills fs LEFT JOIN flash_card_sets fcs ON fs.flashCardSetId=fcs.id WHERE fs.id=?').get(r.lastInsertRowid) as Record<string, unknown>
    return normalize(row)
  },
  update: (id: number, p: Record<string, unknown>) => {
    db.prepare("UPDATE fc_skills SET name=?,proficiency=?,date=?,flashCardSetId=?,updatedAt=datetime('now') WHERE id=?").run(p.name, p.proficiency??3, p.date??null, p.flashCardSetId??null, id)
    const row = db.prepare('SELECT fs.*, fcs.title as flashCardSetTitle FROM fc_skills fs LEFT JOIN flash_card_sets fcs ON fs.flashCardSetId=fcs.id WHERE fs.id=?').get(id) as Record<string, unknown>
    return normalize(row)
  },
  delete: (id: number) => { db.prepare('DELETE FROM fc_skills WHERE id=?').run(id) }
}

// ─── Image Files ──────────────────────────────────────────────────────────────

export const imageFiles = {
  getAll: () => db.prepare('SELECT * FROM image_files ORDER BY uploadedAt DESC').all(),
  create: (filename: string, label?: string) => {
    const r = db.prepare('INSERT INTO image_files (filename, label) VALUES (?, ?)').run(filename, label ?? null)
    return db.prepare('SELECT * FROM image_files WHERE id=?').get(r.lastInsertRowid)
  },
  updateLabel: (id: number, label: string) => {
    db.prepare('UPDATE image_files SET label=? WHERE id=?').run(label, id)
    return db.prepare('SELECT * FROM image_files WHERE id=?').get(id)
  },
  delete: (id: number) => { db.prepare('DELETE FROM image_files WHERE id=?').run(id) }
}

// ─── Resume Files ─────────────────────────────────────────────────────────────

export const resumeFiles = {
  getAll: () => db.prepare('SELECT * FROM resume_files ORDER BY uploadedAt DESC').all(),
  create: (filename: string, label?: string) => {
    const r = db.prepare('INSERT INTO resume_files (filename, label) VALUES (?, ?)').run(filename, label ?? null)
    return db.prepare('SELECT * FROM resume_files WHERE id=?').get(r.lastInsertRowid)
  },
  updateLabel: (id: number, label: string) => {
    db.prepare('UPDATE resume_files SET label=? WHERE id=?').run(label, id)
    return db.prepare('SELECT * FROM resume_files WHERE id=?').get(id)
  },
  delete: (id: number) => { db.prepare('DELETE FROM resume_files WHERE id=?').run(id) }
}

// ─── Note Groups ─────────────────────────────────────────────────────────────

export const noteGroups = {
  getAll: () => {
    return db.prepare(`
      SELECT g.*, (SELECT COUNT(*) FROM notes WHERE groupId = g.id) as noteCount
      FROM note_groups g ORDER BY g.updatedAt DESC
    `).all()
  },
  create: (name: string) => {
    const r = db.prepare('INSERT INTO note_groups (name) VALUES (?)').run(name)
    return db.prepare('SELECT * FROM note_groups WHERE id=?').get(r.lastInsertRowid)
  },
  update: (id: number, name: string) => {
    db.prepare("UPDATE note_groups SET name=?,updatedAt=datetime('now') WHERE id=?").run(name, id)
    return db.prepare('SELECT * FROM note_groups WHERE id=?').get(id)
  },
  delete: (id: number) => { db.prepare('DELETE FROM note_groups WHERE id=?').run(id) }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export const notes = {
  listByGroup: (groupId: number) => db.prepare('SELECT * FROM notes WHERE groupId=? ORDER BY updatedAt DESC').all(groupId),
  create: (groupId: number, title: string) => {
    const r = db.prepare('INSERT INTO notes (groupId, title, content) VALUES (?, ?, ?)').run(groupId, title, '')
    return db.prepare('SELECT * FROM notes WHERE id=?').get(r.lastInsertRowid)
  },
  update: (id: number, p: Record<string, unknown>) => {
    const fields: string[] = []
    const vals: unknown[] = []
    if (p.title !== undefined) { fields.push('title=?'); vals.push(p.title) }
    if (p.content !== undefined) { fields.push('content=?'); vals.push(p.content) }
    if (fields.length) {
      db.prepare(`UPDATE notes SET ${fields.join(',')},updatedAt=datetime('now') WHERE id=?`).run(...vals, id)
    }
    return db.prepare('SELECT * FROM notes WHERE id=?').get(id)
  },
  delete: (id: number) => { db.prepare('DELETE FROM notes WHERE id=?').run(id) }
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export const skills = {
  getAll: () => normalizeAll(db.prepare('SELECT * FROM skills ORDER BY proficiency DESC').all() as Record<string, unknown>[]),
  create: (p: Record<string, unknown>) => {
    const r = db.prepare('INSERT INTO skills (name,proficiency,date,tags) VALUES (?,?,?,?)').run(p.name, p.proficiency??3, p.date??null, JSON.stringify(p.tags ?? []))
    return normalize(db.prepare('SELECT * FROM skills WHERE id=?').get(r.lastInsertRowid) as Record<string, unknown>)
  },
  update: (id: number, p: Record<string, unknown>) => {
    db.prepare("UPDATE skills SET name=?,proficiency=?,date=?,tags=?,updatedAt=datetime('now') WHERE id=?").run(p.name, p.proficiency??3, p.date??null, JSON.stringify(p.tags ?? []), id)
    return normalize(db.prepare('SELECT * FROM skills WHERE id=?').get(id) as Record<string, unknown>)
  },
  delete: (id: number) => { db.prepare('DELETE FROM skills WHERE id=?').run(id) }
}

// ─── Quick Accomplishments ────────────────────────────────────────────────────

export const quickAccomplishments = {
  getAll: () => db.prepare('SELECT * FROM quick_accomplishments ORDER BY dateFinished DESC, createdAt DESC').all(),
  create: (p: Record<string, unknown>) => {
    const r = db.prepare('INSERT INTO quick_accomplishments (category, description, dateFinished, status) VALUES (?, ?, ?, ?)')
      .run(p.category, p.description, p.dateFinished ?? null, p.status ?? 'Completed')
    return db.prepare('SELECT * FROM quick_accomplishments WHERE id=?').get(r.lastInsertRowid)
  },
  update: (id: number, p: Record<string, unknown>) => {
    db.prepare("UPDATE quick_accomplishments SET category=?, description=?, dateFinished=?, status=?, updatedAt=datetime('now') WHERE id=?")
      .run(p.category, p.description, p.dateFinished ?? null, p.status ?? 'Completed', id)
    return db.prepare('SELECT * FROM quick_accomplishments WHERE id=?').get(id)
  },
  delete: (id: number) => { db.prepare('DELETE FROM quick_accomplishments WHERE id=?').run(id) }
}
