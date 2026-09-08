import { Route, Routes, Navigate } from "react-router-dom";
import Main from "./pages/Main";
import Room from "./pages/Room";

function App() {

  return (
    <Routes>
      <Route path="/" element={<Main />} />
      <Route path="/room/:id" element={<Room />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
