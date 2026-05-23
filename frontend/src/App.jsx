import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import { Toaster } from "react-hot-toast";
import Register from './pages/Register';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* all protected pages go inside here */}
        {/* <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kanban"    element={<Kanban />} />
          <Route path="/snippets"  element={<Snippets />} />
        </Route> */}
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1117',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </Router>
  );
}

export default App;