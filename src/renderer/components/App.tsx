import React from "react";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import Search from "./Search"; 
import Settings from "./Settings/Settings";
import { Routes, Route, Navigate } from "react-router-dom";

const App = () => {

  // const googleAuth = useGoogleAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/search" replace />} />
      <Route path="/search" element={<Search />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/search" replace />} />
    </Routes>
    // <Settings />

  );
}

export default App;
