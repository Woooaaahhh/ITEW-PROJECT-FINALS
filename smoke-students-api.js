import axios from 'axios'

const base = 'http://localhost:3001'

const login = await axios.post(`${base}/api/login`, {
  identifier: 'admin@spms.edu',
  password: 'admin123',
})

const token = login.data.token
const headers = { Authorization: `Bearer ${token}` }

const list = await axios.get(`${base}/api/students`, { headers })
const first = list.data.students?.[0]
console.log('listCount', list.data.students?.length || 0, 'firstId', first?.student_id)

if (first?.student_id) {
  const detail = await axios.get(`${base}/api/students/${first.student_id}`, { headers })
  console.log('detailName', detail.data.student?.first_name, detail.data.student?.last_name)
  const upd = await axios.put(
    `${base}/api/students/${first.student_id}`,
    { section: detail.data.student.section },
    { headers },
  )
  console.log('updateOk', Boolean(upd.data.student))
}

