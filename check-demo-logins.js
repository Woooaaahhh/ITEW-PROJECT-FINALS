import axios from 'axios'

async function check(identifier, password) {
  try {
    const res = await axios.post('http://localhost:3001/api/login', { identifier, password })
    console.log(`${identifier}: OK (${res.data?.user?.role ?? 'unknown'})`)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(`${identifier}: FAIL (${error.response?.status ?? 'no-response'}) ${error.response?.data?.message ?? error.message}`)
      return
    }
    console.log(`${identifier}: FAIL (unexpected error)`)
  }
}

await check('admin@spms.edu', 'admin123')
await check('faculty@spms.edu', 'faculty123')
