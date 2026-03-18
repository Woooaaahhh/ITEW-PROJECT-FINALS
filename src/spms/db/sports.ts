import { nowIso, openSpmsDb, type Sport } from './spmsDb'

function makeId() {
  return `SP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function listSports(options?: { activeOnly?: boolean }): Promise<Sport[]> {
  const db = await openSpmsDb()
  const all = await db.getAll('sports')
  const filtered = options?.activeOnly ? all.filter((s) => s.isActive) : all
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createSport(input: { name: string }): Promise<Sport> {
  const db = await openSpmsDb()
  const ts = nowIso()
  const sport: Sport = {
    id: makeId(),
    name: input.name.trim(),
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }
  if (!sport.name) throw new Error('Sport name is required')
  await db.put('sports', sport)
  return sport
}

export async function updateSport(
  id: string,
  patch: Partial<Pick<Sport, 'name' | 'isActive'>>,
): Promise<Sport> {
  const db = await openSpmsDb()
  const existing = await db.get('sports', id)
  if (!existing) throw new Error('Sport not found')
  const updated: Sport = {
    ...existing,
    ...patch,
    name: (patch.name ?? existing.name).trim(),
    updatedAt: nowIso(),
  }
  if (!updated.name) throw new Error('Sport name is required')
  await db.put('sports', updated)
  return updated
}

export async function deleteSport(id: string): Promise<void> {
  const db = await openSpmsDb()
  await db.delete('sports', id)
}

export async function seedSportsIfEmpty(): Promise<void> {
  const db = await openSpmsDb()
  const seeded = await db.get('meta', 'sports_seeded')
  if (seeded?.value === 'true') return

  const existing = await db.count('sports')
  if (existing > 0) {
    await db.put('meta', { key: 'sports_seeded', value: 'true' })
    return
  }

  const ts = nowIso()
  const demoNames = ['Basketball', 'Volleyball', 'Badminton', 'Table Tennis', 'Track & Field']
  const demo: Sport[] = demoNames.map((name) => ({
    id: makeId(),
    name,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }))

  const tx = db.transaction(['sports', 'meta'], 'readwrite')
  await Promise.all(demo.map((s) => tx.objectStore('sports').put(s)))
  await tx.objectStore('meta').put({ key: 'sports_seeded', value: 'true' })
  await tx.done
}

