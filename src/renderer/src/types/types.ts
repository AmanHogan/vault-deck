import { z } from "zod"
import {
  businessCommitmentOneSchema,
  commitmentStatusEnum,
  valueEntrySchema,
  statusOptions,
} from "@/schemas/schemas"

// Business Commitment One
export type BusinessCommitmentOne = z.infer<typeof businessCommitmentOneSchema>

// API payload types (fields sent to/from backend — no UI-only fields)
export type CreateBusinessCommitmentOneDTO = Omit<BusinessCommitmentOne, "id" | "createdAt">
export type UpdateBusinessCommitmentOneDTO = Partial<CreateBusinessCommitmentOneDTO>

// Form state type — extends the API type with UI-only fields
export type BusinessCommitmentOneFormState = CreateBusinessCommitmentOneDTO & {
  valueEntryList: ValueEntry[]
  status?: CommitmentStatus
}

// -- Helper Types -- //
export type CommitmentStatus = z.infer<typeof commitmentStatusEnum>
export const StatusMap: CommitmentStatus[] = statusOptions as CommitmentStatus[]
export type ValueEntry = z.infer<typeof valueEntrySchema>

// -- Empty Forms -- //
export const emptyBusinessCommitmentForm = (): BusinessCommitmentOneFormState => ({
  workItem: "",
  started: "",
  dateCompleted: "",
  applicationContext: "",
  description: "",
  problemOpportunity: "",
  whoBenefited: "",
  impact: "",
  valueCategories: [],
  improvedOutcomes: false,
  improvedOutcomesText: "",
  increasedEfficiency: false,
  increasedEfficiencyText: "",
  reducedRiskCost: false,
  reducedRiskCostText: "",
  enhancedCustomerExperience: false,
  enhancedCustomerExperienceText: "",
  enhancedEmployeeExperience: false,
  enhancedEmployeeExperienceText: "",
  alignment: "",
  statusNotes: "",
  valueEntryList: [],
  status: "IN_PROGRESS",
})

// ─── Development Commitment One ──────────────────────────────────────────────

export type DevelopmentCommitmentOne = {
  id?: number
  itemName: string
  description?: string
  itemDate?: string
  done?: boolean
  hours?: number
  tags?: string[]
  modules?: LearningModule[]
  // Read-only aggregates returned by the backend
  moduleCount?: number
  moduleHours?: number
  createdAt?: string
  updatedAt?: string
}

export type LearningModule = {
  id?: number
  itemId?: number
  moduleName: string
  type?: string
  hours?: number
  dateStarted?: string
  dateFinished?: string
  finished?: boolean
  required?: boolean
  description?: string
  createdAt?: string
  updatedAt?: string
}

export type CreateDevelopmentCommitmentOneDTO = Omit<
  DevelopmentCommitmentOne,
  "id" | "modules" | "moduleCount" | "moduleHours" | "createdAt" | "updatedAt"
>
export type UpdateDevelopmentCommitmentOneDTO = Partial<CreateDevelopmentCommitmentOneDTO>
export type CreateLearningModuleDTO = Omit<LearningModule, "id" | "itemId" | "createdAt" | "updatedAt">
export type UpdateLearningModuleDTO = Partial<CreateLearningModuleDTO>

export const emptyDevelopmentCommitmentOneForm = (): CreateDevelopmentCommitmentOneDTO => ({
  itemName: "",
  description: "",
  itemDate: "",
  done: false,
  hours: undefined,
  tags: [],
})

export const emptyLearningModuleForm = (): CreateLearningModuleDTO => ({
  moduleName: "",
  type: "",
  hours: undefined,
  dateStarted: "",
  dateFinished: "",
  finished: false,
  required: false,
  description: "",
})

// ─── Development Commitment Two ──────────────────────────────────────────────

export type DevelopmentCommitmentTwo = {
  id?: number
  eventName: string
  type?: string
  applicationContext?: string
  description?: string
  impact?: string
  started?: string
  finished?: string
  done?: boolean
  required?: boolean
  createdAt?: string
  updatedAt?: string
}

export type EventSubItem = {
  id?: number
  eventId?: number
  subEventName: string
  description?: string
  started?: string
  finished?: string
  done?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CreateDevelopmentCommitmentTwoDTO = Omit<
  DevelopmentCommitmentTwo,
  "id" | "subEvents" | "createdAt" | "updatedAt"
>
export type CreateEventSubItemDTO = Omit<EventSubItem, "id" | "eventId" | "createdAt" | "updatedAt">
export type UpdateEventSubItemDTO = Partial<CreateEventSubItemDTO>

export const emptyDevelopmentCommitmentTwoForm = (): CreateDevelopmentCommitmentTwoDTO => ({
  eventName: "",
  type: "",
  applicationContext: "",
  description: "",
  impact: "",
  started: "",
  finished: "",
  done: false,
  required: false,
})

export const emptyEventSubItemForm = (): CreateEventSubItemDTO => ({
  subEventName: "",
  description: "",
  started: "",
  finished: "",
  done: false,
})

// ─── Business Commitment Two ─────────────────────────────────────────────────

export type BusinessCommitmentTwo = {
  id?: number
  eventName: string
  type?: string
  done?: boolean
  started?: string
  finished?: string
  required?: boolean
  applicationContext?: string
  description?: string
  impact?: string
  subEvents?: SubEvent[]
  createdAt?: string
  updatedAt?: string
}

export type SubEvent = {
  id?: number
  eventId?: number
  subEventName: string
  description?: string
  started?: string
  finished?: string
  done?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CreateSubEventDTO = Omit<SubEvent, "id" | "eventId" | "createdAt" | "updatedAt">
export type UpdateSubEventDTO = Partial<CreateSubEventDTO>
export type CreateBusinessCommitmentTwoDTO = Omit<BusinessCommitmentTwo, "id" | "subEvents" | "createdAt" | "updatedAt">
export type UpdateBusinessCommitmentTwoDTO = Partial<CreateBusinessCommitmentTwoDTO>

export const emptyBusinessCommitmentTwoForm = (): CreateBusinessCommitmentTwoDTO => ({
  eventName: "",
  type: "",
  done: false,
  started: "",
  finished: "",
  required: false,
  applicationContext: "",
  description: "",
  impact: "",
})

// ─── One on One ──────────────────────────────────────────────────────────────

export type OneOnOne = {
  id?: number
  documentDate: string
  businessPartnerWork?: string
  workloadConcerns?: string
  tdpContributions?: string
  utilizationPercentage?: number
  trainingSkills?: string
  pursuingDegrees?: string
  compliancePercentage?: number
  ehsTrainingPercentage?: number
  growthHubProgress?: string
  successPathwaysUpdated?: boolean
  contingencyTrainingPercentage?: number
  innovationEvents?: string
  accomplishments?: string
  challenges?: string
  goals?: string
  questions?: string
  receivingSupport?: string
  additionalItems?: string
  outOfOfficePlans?: string
}

export type CreateOneOnOneDTO = Omit<OneOnOne, "id">
export type UpdateOneOnOneDTO = Partial<CreateOneOnOneDTO>

// ─── Action Items ─────────────────────────────────────────────────────────────

export type ActionItem = {
  id?: number
  name: string
  description?: string
  criticality?: string
  dateStarted?: string
  dateFinished?: string
  dueDate?: string
  dueTime?: string
  completed?: boolean
  createdAt?: string
  updatedAt?: string
}

export const CRITICALITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const
export type Criticality = (typeof CRITICALITY_OPTIONS)[number]

export type CreateActionItemDTO = Omit<ActionItem, "id" | "createdAt" | "updatedAt">
export type UpdateActionItemDTO = Partial<CreateActionItemDTO>

export const emptyActionItemForm = (): CreateActionItemDTO => ({
  name: "",
  description: "",
  criticality: "",
  dateStarted: "",
  dateFinished: "",
  dueDate: "",
  dueTime: "",
  completed: false,
})

export const emptyOneOnOneForm = (): CreateOneOnOneDTO => ({
  documentDate: "",
  businessPartnerWork: "",
  workloadConcerns: "",
  tdpContributions: "",
  utilizationPercentage: undefined,
  trainingSkills: "",
  pursuingDegrees: "",
  compliancePercentage: undefined,
  ehsTrainingPercentage: undefined,
  growthHubProgress: "",
  successPathwaysUpdated: false,
  contingencyTrainingPercentage: undefined,
  innovationEvents: "",
  accomplishments: "",
  challenges: "",
  goals: "",
  questions: "",
  receivingSupport: "",
  additionalItems: "",
  outOfOfficePlans: "",
})

// ─── Skills ──────────────────────────────────────────────────────────────────

export type Skill = {
  id?: number
  name: string
  proficiency: number
  date?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export type CreateSkillDTO = Omit<Skill, "id" | "createdAt" | "updatedAt">

export const emptySkillForm = (): CreateSkillDTO => ({
  name: "",
  proficiency: 3,
  date: "",
  tags: [],
})

// ─── Flashcards ───────────────────────────────────────────────────────────────

export type FlashCard = {
  id: number
  setId: number
  term: string
  definition: string
  sortOrder: number
  groupName?: string
  termImageUrl?: string
  definitionImageUrl?: string
  hint?: string
  starred: boolean
}

export type FlashCardSet = {
  id: number
  title: string
  description?: string
  topic?: string
  ownerId?: string
  tags: string[]
  flashCards: FlashCard[]
  timesStudied: number
  cardCount?: number
  createdAt?: string
  updatedAt?: string
}

export type ImageFile = {
  id: number
  filename: string
  label?: string
  uploadedAt: string
}

export type ResumeFile = {
  id: number
  filename: string
  label?: string
  uploadedAt: string
}

export type NoteGroup = {
  id: number
  name: string
  noteCount: number
  createdAt: string
  updatedAt: string
}

export type Note = {
  id: number
  groupId: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type FcSkill = {
  id: number
  name: string
  proficiency: number
  date?: string
  flashCardSetId?: number
  flashCardSetTitle?: string
  createdAt?: string
  updatedAt?: string
}

// ─── Progressions & STAR ─────────────────────────────────────────────────────

export type StarSourceType = "bcomm1" | "bcomm2" | "dcomm2"

export type StarEntry = {
  id: string
  sourceType: StarSourceType | "manual"
  sourceId?: number
  title: string
  situation: string
  task: string
  action: string
  result: string
}

export type DevelopmentEntry = {
  id: string
  sourceId?: number
  title: string
  body: string
  hours?: number
}

export type Progression = {
  id: number
  title: string
  businessEntries: StarEntry[]
  programEntries: StarEntry[]
  developmentEntries: DevelopmentEntry[]
  createdAt?: string
  updatedAt?: string
}

export type SaveProgressionInput = {
  title: string
  businessEntries: StarEntry[]
  programEntries: StarEntry[]
  developmentEntries: DevelopmentEntry[]
}

// ─── Periodic Reviews ────────────────────────────────────────────────────────

export const REVIEW_TYPES = ['midyear', 'endofyear'] as const
export type PeriodicReviewType = (typeof REVIEW_TYPES)[number]

export type PeriodicReview = {
  id?: number
  title: string
  reviewType: PeriodicReviewType
  reviewDate?: string
  accomplishments: string
  developmentProgress: string
  futurePriorities: string
  additionalNotes: string
  createdAt?: string
  updatedAt?: string
}

export type CreatePeriodicReviewDTO = Omit<PeriodicReview, 'id' | 'createdAt' | 'updatedAt'>
export type UpdatePeriodicReviewDTO = Partial<CreatePeriodicReviewDTO>

export const emptyPeriodicReviewForm = (): CreatePeriodicReviewDTO => ({
  title: '',
  reviewType: 'midyear',
  reviewDate: '',
  accomplishments: '',
  developmentProgress: '',
  futurePriorities: '',
  additionalNotes: '',
})

export type QuickAccomplishmentCategory = 'bcomm1' | 'bcomm2' | 'dcomm1' | 'dcomm2'
export const QA_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Exceeded Expectations'] as const
export type QAStatus = typeof QA_STATUSES[number]

export type QuickAccomplishment = {
  id: number
  category: QuickAccomplishmentCategory
  description: string
  dateFinished?: string
  status: QAStatus
  createdAt: string
  updatedAt: string
}

// ─── Vault ────────────────────────────────────────────────────────────────────

export type VaultEntry = {
  path: string
  name: string
  type: 'file' | 'directory'
  extension: string
  children?: VaultEntry[]
}
