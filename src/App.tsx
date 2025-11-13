import { useState } from 'react'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import {SignUp} from './view/SignUp'

function App() {
  const [count, setCount] = useState(0)

  return (
        <BrowserRouter>
      <HeaderComponent />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/logout" element={<LogOut />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
      <FooterComponent />
    </BrowserRouter>
  )
}

export default App
