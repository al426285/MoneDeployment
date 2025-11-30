import { useState } from 'react'
import '../styles/styles.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SignUp from './view/User/SignUp'
import LogIn from './view/User/LogIn'
import AccountManagement from './view/User/AccountManagement'
import RecuperarContraseña from './view/User/RecuperarContraseña'
import LogOut from './view/User/LogOut'
import NewPlace from './view/Place/NewPlace'
function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>Hola Mone</h1>} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/account" element={<AccountManagement />} />
        <Route path="/email-update-confirmation" element={<h1>Email Update Confirmation Page</h1>} />
        <Route path="/recover-password" element={<RecuperarContraseña />} />
        <Route path="/logout" element={<LogOut />} />
        <Route path="/newplace" element={<NewPlace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
