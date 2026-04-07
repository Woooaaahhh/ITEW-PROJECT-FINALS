import { nowIso, openSpmsDb, type Skill, type StudentSkill } from './spmsDb'
import axios from 'axios'

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

export async function listSkills(options?: { activeOnly?: boolean }): Promise<Skill[]> {
  const res = await axios.get<{ skills: ApiSkill[] }>('/api/skills', {
    params: { activeOnly: options?.activeOnly ? 'true' : 'false' },
  })
  return (res.data.skills ?? []).map(mapApiSkill).sort((a, b) => a.name.localeCompare(b.name))
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

  const tx = db.transaction('studentSkills', 'readwrite')
  const existing = await tx.store.index('by-studentId').getAll(studentId)
  const existingSet = new Set(existing.map((r: StudentSkill) => r.skillId))
  const nextSet = new Set(unique)

  await Promise.all(
    existing
      .filter((r: StudentSkill) => !nextSet.has(r.skillId))
      .map((r: StudentSkill) => tx.store.delete([r.studentId, r.skillId])),
  )

  const ts = nowIso()
  await Promise.all(
    unique
      .filter((skillId) => !existingSet.has(skillId))
      .map((skillId) =>
        tx.store.put({
          studentId,
          skillId,
          createdAt: ts,
        }),
      ),
  )
  await tx.done
}

export async function seedSkillsIfEmpty(): Promise<void> {
  return
}
