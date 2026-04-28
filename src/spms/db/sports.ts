import { nowIso, openSpmsDb, type Sport } from './spmsDb'

function makeId() {
  return `SP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const DEFAULT_DEMO_SPORTS: Array<Pick<Sport, 'id' | 'name'>> = [
  { id: 'SP-seed-basketball', name: 'Basketball' },
  { id: 'SP-seed-volleyball', name: 'Volleyball' },
  { id: 'SP-seed-badminton', name: 'Badminton' },
  { id: 'SP-seed-table-tennis', name: 'Table Tennis' },
  { id: 'SP-seed-track-field', name: 'Track & Field' },
]

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
  const ts = nowIso()
  const existing = await db.getAll('sports')
  const existingById = new Map(existing.map((sport) => [sport.id, sport]))
  const missingDefaults = DEFAULT_DEMO_SPORTS.filter((sport) => !existingById.has(sport.id))
  if (seeded?.value === 'true' && missingDefaults.length === 0) return

  const tx = db.transaction(['sports', 'meta'], 'readwrite')
  await Promise.all(
    missingDefaults.map((sport) =>
      tx.objectStore('sports').put({
        id: sport.id,
        name: sport.name,
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      }),
    ),
  )
  await tx.objectStore('meta').put({ key: 'sports_seeded', value: 'true' })
  await tx.done
}

