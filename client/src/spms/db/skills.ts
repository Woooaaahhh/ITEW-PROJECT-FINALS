import { nowIso, openSpmsDb, type Skill, type StudentSkill } from './spmsDb'
import axios from 'axios'
import { isSeedDemoStudentId } from './demoSeedUtils'

const LOCAL_SKILLS_SEEDED_KEY = 'local_skills_seeded_v1'

const DEFAULT_LOCAL_SKILLS: Array<Pick<Skill, 'id' | 'name' | 'category'>> = [
  { id: 'SK-seed-python', name: 'Python Programming', category: 'Technical' },
  { id: 'SK-seed-java', name: 'Java Development', category: 'Technical' },
  { id: 'SK-seed-web', name: 'Web Development', category: 'Technical' },
  { id: 'SK-seed-database', name: 'Database Management', category: 'Technical' },
  { id: 'SK-seed-public-speaking', name: 'Public Speaking', category: 'Soft Skill' },
  { id: 'SK-seed-leadership', name: 'Leadership', category: 'Soft Skill' },
  { id: 'SK-seed-teamwork', name: 'Teamwork', category: 'Soft Skill' },
  { id: 'SK-seed-problem-solving', name: 'Problem Solving', category: 'Soft Skill' },
  { id: 'SK-seed-research', name: 'Research Writing', category: 'Academic' },
  { id: 'SK-seed-math', name: 'Mathematics Quiz Bee', category: 'Academic' },
  { id: 'SK-seed-graphics', name: 'Graphic Design', category: 'Creative' },
  { id: 'SK-seed-video', name: 'Video Editing', category: 'Creative' },
] as const

type ApiSkill = {
  skill_id: number
  name: string
  category: string
  is_active: number
  created_at?: string
}

function mapApiSkill(s: ApiSkill): Skill {
  const createdAt = s.created_at ? new Date(s.created_at).toISOString() : nowIso()
  return {
    id: String(s.skill_id),
    name: s.name,
    category: s.category,
    isActive: s.is_active === 1,
    createdAt,
    updatedAt: createdAt,
  }
}

async function listLocalSkills(): Promise<Skill[]> {
  const db = await openSpmsDb()
  return db.getAll('skills')
}

function mergeSkills(apiSkills: Skill[], localSkills: Skill[]) {
  const byId = new Map<string, Skill>()
  for (const skill of localSkills.map((item) => ({ ...item, updatedAt: item.updatedAt ?? item.createdAt }))) {
    byId.set(skill.id, skill)
  }
  for (const skill of apiSkills) {
    const existing = byId.get(skill.id)
    byId.set(skill.id, existing ? { ...existing, ...skill } : skill)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export async function listSkills(options?: { activeOnly?: boolean }): Promise<Skill[]> {
  const localSkills = await listLocalSkills()
  try {
    const res = await axios.get<{ skills: ApiSkill[] }>('/api/skills', {
      params: { activeOnly: options?.activeOnly ? 'true' : 'false' },
    })
    const apiSkills = (res.data.skills ?? []).map(mapApiSkill)
    const merged = mergeSkills(apiSkills, localSkills)
    return options?.activeOnly ? merged.filter((skill) => skill.isActive) : merged
  } catch {
    const fallback = localSkills.sort((a, b) => a.name.localeCompare(b.name))
    return options?.activeOnly ? fallback.filter((skill) => skill.isActive) : fallback
  }
}

export async function createSkill(input: { name: string; category: string }): Promise<Skill> {
  const name = input.name.trim()
  const category = input.category.trim()
  if (!name) throw new Error('Skill name is required')
  if (!category) throw new Error('Skill category is required')
  const res = await axios.post<{ skill: ApiSkill }>('/api/skills', { name, category })
  return mapApiSkill(res.data.skill)
}

export async function updateSkill(
  id: string,
  patch: Partial<Pick<Skill, 'name' | 'category' | 'isActive'>>,
): Promise<Skill> {
  const payload: { name?: string; category?: string; is_active?: number } = {}
  if (patch.name !== undefined) payload.name = patch.name.trim()
  if (patch.category !== undefined) payload.category = patch.category.trim()
  if (patch.isActive !== undefined) payload.is_active = patch.isActive ? 1 : 0
  if (payload.name !== undefined && !payload.name) throw new Error('Skill name is required')
  if (payload.category !== undefined && !payload.category) throw new Error('Skill category is required')
  const res = await axios.put<{ skill: ApiSkill }>(`/api/skills/${id}`, payload)
  return mapApiSkill(res.data.skill)
}

export async function deleteSkill(id: string): Promise<void> {
  await axios.delete(`/api/skills/${id}`)
  const db = await openSpmsDb()
  const keys = await db.getAllKeysFromIndex('studentSkills', 'by-skillId', id)
  const tx = db.transaction('studentSkills', 'readwrite')
  await Promise.all(keys.map((k) => tx.store.delete(k)))
  await tx.done
}

export async function listStudentSkills(studentId: string): Promise<StudentSkill[]> {
  const db = await openSpmsDb()
  const rows = await db.getAllFromIndex('studentSkills', 'by-studentId', studentId)
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function setStudentSkills(studentId: string, skillIds: string[]): Promise<void> {
  const db = await openSpmsDb()
  const unique = Array.from(new Set(skillIds.filter(Boolean)))

  // Clear all existing skills for this student first
  const clearTx = db.transaction('studentSkills', 'readwrite')
  const existingSkills = await clearTx.store.index('by-studentId').getAll(studentId)
  await Promise.all(
    existingSkills.map((skill: StudentSkill) => 
      clearTx.store.delete([skill.studentId, skill.skillId])
    )
  )
  await clearTx.done

  // Add the new skills
  if (unique.length > 0) {
    const addTx = db.transaction('studentSkills', 'readwrite')
    const ts = nowIso()
    await Promise.all(
      unique.map((skillId) =>
        addTx.store.put({
          studentId,
          skillId,
          createdAt: ts,
        }),
      ),
    )
    await addTx.done
  }
}

export async function seedSkillsIfEmpty(): Promise<void> {
  const db = await openSpmsDb()
  const seeded = await db.get('meta', LOCAL_SKILLS_SEEDED_KEY)
  if (seeded?.value === 'true') return

  const existing = await db.count('skills')
  if (existing === 0) {
    const ts = nowIso()
    const tx = db.transaction(['skills', 'meta'], 'readwrite')
    await Promise.all(
      DEFAULT_LOCAL_SKILLS.map((skill) =>
        tx.objectStore('skills').put({
          id: skill.id,
          name: skill.name,
          category: skill.category,
          isActive: true,
          createdAt: ts,
          updatedAt: ts,
        }),
      ),
    )
    await tx.objectStore('meta').put({ key: LOCAL_SKILLS_SEEDED_KEY, value: 'true' })
    await tx.done
    return
  }

  await db.put('meta', { key: LOCAL_SKILLS_SEEDED_KEY, value: 'true' })
}

export async function ensureSeededDemoStudentSkills(studentIds: string[]): Promise<void> {
  await seedSkillsIfEmpty()
  const db = await openSpmsDb()
  const allSkills = (await listLocalSkills()).filter((skill) => skill.isActive)
  if (allSkills.length === 0) return

  const demoSkillIds = allSkills.map((skill) => skill.id)
  const tx = db.transaction('studentSkills', 'readwrite')

  for (const studentId of studentIds) {
    if (!isSeedDemoStudentId(studentId)) continue
    const existing = await tx.store.index('by-studentId').getAll(studentId)
    if (existing.length > 0) continue

    const base = studentId.length
    const assigned = [
      demoSkillIds[base % demoSkillIds.length],
      demoSkillIds[(base + 3) % demoSkillIds.length],
      demoSkillIds[(base + 7) % demoSkillIds.length],
    ]
    const createdAt = nowIso()
    for (const skillId of new Set(assigned)) {
      await tx.store.put({ studentId, skillId, createdAt })
    }
  }

  await tx.done
}
