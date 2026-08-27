import type {
  BusinessCommitmentOne,
  CreateBusinessCommitmentOneDTO,
  UpdateBusinessCommitmentOneDTO,
  DevelopmentCommitmentOne,
  CreateDevelopmentCommitmentOneDTO,
  UpdateDevelopmentCommitmentOneDTO,
  LearningModule,
  CreateLearningModuleDTO,
  UpdateLearningModuleDTO,
  OneOnOne,
  CreateOneOnOneDTO,
  UpdateOneOnOneDTO,
  ActionItem,
  CreateActionItemDTO,
  UpdateActionItemDTO,
  Skill,
  CreateSkillDTO,
} from '@/types/types'

const { api } = window

// ─── Business Commitments One ─────────────────────────────────────────────────

export const getAllCommitmentsOne = (): Promise<BusinessCommitmentOne[]> =>
  api.bcomm1.getAll() as Promise<BusinessCommitmentOne[]>

export const createCommitmentOne = (payload: CreateBusinessCommitmentOneDTO): Promise<BusinessCommitmentOne> =>
  api.bcomm1.create(payload) as Promise<BusinessCommitmentOne>

export const updateBusinessCommitmentOne = (id: number, payload: UpdateBusinessCommitmentOneDTO): Promise<BusinessCommitmentOne> =>
  api.bcomm1.update(id, payload) as Promise<BusinessCommitmentOne>

export const deleteCommitmentOne = (id: number): Promise<void> =>
  api.bcomm1.delete(id)

// ─── Development Commitments One ─────────────────────────────────────────────

export const getAllDevelopmentCommitmentsOne = (): Promise<DevelopmentCommitmentOne[]> =>
  api.dcomm1.getAll() as Promise<DevelopmentCommitmentOne[]>

export const createDevelopmentCommitmentOne = (payload: CreateDevelopmentCommitmentOneDTO): Promise<DevelopmentCommitmentOne> =>
  api.dcomm1.create(payload) as Promise<DevelopmentCommitmentOne>

export const updateDevelopmentCommitmentOne = (id: number, payload: UpdateDevelopmentCommitmentOneDTO): Promise<DevelopmentCommitmentOne> =>
  api.dcomm1.update(id, payload) as Promise<DevelopmentCommitmentOne>

export const deleteDevelopmentCommitmentOne = (id: number): Promise<void> =>
  api.dcomm1.delete(id)

export const getModulesForItem = (itemId: number): Promise<LearningModule[]> =>
  api.dcomm1.getModules(itemId) as Promise<LearningModule[]>

export const createModuleForItem = (itemId: number, payload: CreateLearningModuleDTO): Promise<LearningModule> =>
  api.dcomm1.createModule(itemId, payload) as Promise<LearningModule>

export const updateLearningModule = (moduleId: number, payload: UpdateLearningModuleDTO): Promise<LearningModule> =>
  api.dcomm1.updateModule(moduleId, payload) as Promise<LearningModule>

export const deleteLearningModule = (moduleId: number): Promise<void> =>
  api.dcomm1.deleteModule(moduleId)

// ─── One on One ───────────────────────────────────────────────────────────────

export const getAllOneOnOnes = (): Promise<OneOnOne[]> =>
  api.oneOnOne.getAll() as Promise<OneOnOne[]>

export const createOneOnOne = (payload: CreateOneOnOneDTO): Promise<OneOnOne> =>
  api.oneOnOne.create(payload) as Promise<OneOnOne>

export const updateOneOnOne = (id: number, payload: UpdateOneOnOneDTO): Promise<OneOnOne> =>
  api.oneOnOne.update(id, payload) as Promise<OneOnOne>

export const deleteOneOnOne = (id: number): Promise<void> =>
  api.oneOnOne.delete(id)

// ─── Action Items ─────────────────────────────────────────────────────────────

export const getAllActionItems = (): Promise<ActionItem[]> =>
  api.actionItems.getAll() as Promise<ActionItem[]>

export const createActionItem = (payload: CreateActionItemDTO): Promise<ActionItem> =>
  api.actionItems.create(payload) as Promise<ActionItem>

export const updateActionItem = (id: number, payload: UpdateActionItemDTO): Promise<ActionItem> =>
  api.actionItems.update(id, payload) as Promise<ActionItem>

export const deleteActionItem = (id: number): Promise<void> =>
  api.actionItems.delete(id)

// ─── Skills ───────────────────────────────────────────────────────────────────

export const getAllSkills = (): Promise<Skill[]> =>
  api.skills.getAll() as Promise<Skill[]>

export const createSkill = (payload: CreateSkillDTO): Promise<Skill> =>
  api.skills.create(payload) as Promise<Skill>

export const updateSkill = (id: number, payload: CreateSkillDTO): Promise<Skill> =>
  api.skills.update(id, payload) as Promise<Skill>

export const deleteSkill = (id: number): Promise<void> =>
  api.skills.delete(id)
