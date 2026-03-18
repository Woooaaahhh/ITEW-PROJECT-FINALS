import { nowIso, openSpmsDb, type Skill, type StudentSkill } from './spmsDb'

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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
    id: makeId('SK'),
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
  // also remove any assignments to avoid dangling refs
  const tx = db.transaction(['studentSkills', 'skills'], 'readwrite')
  const idx = tx.objectStore('studentSkills').index('by-skillId')
  const assigned = await idx.getAll(id)
  await Promise.all(assigned.map((r) => tx.objectStore('studentSkills').delete(r.id)))
  await tx.objectStore('skills').delete(id)
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
    { id: makeId('SK'), name: 'Python Programming', category: 'Technical', isActive: true, createdAt: ts, updatedAt: ts },
    { id: makeId('SK'), name: 'Public Speaking', category: 'Soft Skill', isActive: true, createdAt: ts, updatedAt: ts },
    { id: makeId('SK'), name: 'Leadership', category: 'Soft Skill', isActive: true, createdAt: ts, updatedAt: ts },
    { id: makeId('SK'), name: 'Web Development', category: 'Technical', isActive: true, createdAt: ts, updatedAt: ts },
  ]

  const tx = db.transaction(['skills', 'meta'], 'readwrite')
  await Promise.all(demo.map((s) => tx.objectStore('skills').put(s)))
  await tx.objectStore('meta').put({ key: 'skills_seeded', value: 'true' })
  await tx.done
}

export async function listStudentSkills(studentId: string): Promise<StudentSkill[]> {
  const db = await openSpmsDb()
  const idx = db.transaction('studentSkills').store.index('by-studentId')
  const all = await idx.getAll(studentId)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Sets the student's skill assignments to exactly the provided set of skill ids.
 * Returns the final assignments.
 */
export async function setStudentSkills(studentId: string, skillIds: string[]): Promise<StudentSkill[]> {
  const db = await openSpmsDb()
  const desired = Array.from(new Set(skillIds))
  const tx = db.transaction(['studentSkills'], 'readwrite')
  const store = tx.objectStore('studentSkills')
  const idx = store.index('by-studentId')
  const existing = await idx.getAll(studentId)

  const existingBySkillId = new Map(existing.map((r) => [r.skillId, r]))

  // delete removed
  const desiredSet = new Set(desired)
  await Promise.all(
    existing
      .filter((r) => !desiredSet.has(r.skillId))
      .map((r) => store.delete(r.id)),
  )

  // add new
  const ts = nowIso()
  await Promise.all(
    desired
      .filter((sid) => !existingBySkillId.has(sid))
      .map((sid) =>
        store.put({
          id: makeId('SS'),
          studentId,
          skillId: sid,
          createdAt: ts,
        } satisfies StudentSkill),
      ),
  )

  await tx.done

  // re-read for consistent ordering
  return listStudentSkills(studentId)
}

