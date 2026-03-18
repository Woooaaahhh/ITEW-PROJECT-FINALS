import { nowIso, openSpmsDb, type Skill, type StudentSkill } from './spmsDb'

function makeId() {
  return `SK-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function listSkills(options?: { activeOnly?: boolean }): Promise<Skill[]> {
  const db = await openSpmsDb()
  const all = await db.getAll('skills')
  const filtered = options?.activeOnly ? all.filter((s) => s.isActive) : all
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createSkill(input: { name: string; category: string }): Promise<Skill> {
  const db = await openSpmsDb()
  const ts = nowIso()
  const skill: Skill = {
    id: makeId(),
    name: input.name.trim(),
    category: input.category.trim(),
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }
  if (!skill.name) throw new Error('Skill name is required')
  if (!skill.category) throw new Error('Skill category is required')
  await db.put('skills', skill)
  return skill
}

export async function updateSkill(
  id: string,
  patch: Partial<Pick<Skill, 'name' | 'category' | 'isActive'>>,
): Promise<Skill> {
  const db = await openSpmsDb()
  const existing = await db.get('skills', id)
  if (!existing) throw new Error('Skill not found')
  const updated: Skill = {
    ...existing,
    ...patch,
    name: (patch.name ?? existing.name).trim(),
    category: (patch.category ?? existing.category).trim(),
    updatedAt: nowIso(),
  }
  if (!updated.name) throw new Error('Skill name is required')
  if (!updated.category) throw new Error('Skill category is required')
  await db.put('skills', updated)
  return updated
}

export async function deleteSkill(id: string): Promise<void> {
  const db = await openSpmsDb()
  await db.delete('skills', id)

  // remove any student assignments for this skill
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
  const existing = await tx.store.getAllFromIndex('by-studentId', studentId)
  const existingSet = new Set(existing.map((r) => r.skillId))
  const nextSet = new Set(unique)

  // delete removed
  await Promise.all(
    existing
      .filter((r) => !nextSet.has(r.skillId))
      .map((r) => tx.store.delete([r.studentId, r.skillId])),
  )

  // add new
  const ts = nowIso()
  await Promise.all(
    unique
      .filter((id) => !existingSet.has(id))
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
  const db = await openSpmsDb()
  const seeded = await db.get('meta', 'skills_seeded')
  if (seeded?.value === 'true') return

  const existing = await db.count('skills')
  if (existing > 0) {
    await db.put('meta', { key: 'skills_seeded', value: 'true' })
    return
  }

  const ts = nowIso()
  const demo: Skill[] = [
    { id: makeId(), name: 'Programming - Python', category: 'Technical', isActive: true, createdAt: ts, updatedAt: ts },
    { id: makeId(), name: 'Public Speaking', category: 'Soft Skill', isActive: true, createdAt: ts, updatedAt: ts },
    { id: makeId(), name: 'Leadership', category: 'Soft Skill', isActive: true, createdAt: ts, updatedAt: ts },
  ]

  const tx = db.transaction(['skills', 'meta'], 'readwrite')
  await Promise.all(demo.map((s) => tx.objectStore('skills').put(s)))
  await tx.objectStore('meta').put({ key: 'skills_seeded', value: 'true' })
  await tx.done
}

