/** Client-side routing (React Router): in-app navigation; URL updates without a full page reload. */
import { RouterProvider } from 'react-router-dom'
import { spmsRouter } from './spms/router'

function App() {
  return <RouterProvider router={spmsRouter} />
}

export default App
