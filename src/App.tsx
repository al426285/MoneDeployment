import { useState } from 'react'
import '../styles/styles.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import {SignUp} from './view/SignUp'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>Hola Mone</h1>} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
