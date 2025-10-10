import React from "react";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

const App = () => {

  const googleAuth = useGoogleAuth();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "sans-serif"
    }}>
      <h1>🚀 Sentivo</h1>
      <p>Search for everything</p>
      <button onClick={googleAuth.signIn}>Connect to Google Drive</button>
      <button onClick={googleAuth.listFiles}>List Files</button>
      <button onClick={googleAuth.signOut}>Disconnect Google</button>
    </div>
  );
}

export default App;
