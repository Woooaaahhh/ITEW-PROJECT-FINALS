import { RouterProvider } from 'react-router-dom'
import { spmsRouter } from './spms/router'

function App() {
  return <RouterProvider router={spmsRouter} />
}

export default App
