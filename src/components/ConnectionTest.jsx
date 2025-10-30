// src/components/ConnectionTest.jsx
import { useState, useEffect } from "react";
import apiService from "../services/api";

const ConnectionTest = () => {
  const [status, setStatus] = useState("testing");
  const [backendInfo, setBackendInfo] = useState(null);

  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      const data = await apiService.testConnection();
      setBackendInfo(data);
      setStatus("connected");
    } catch (error) {
      setStatus("error");
      console.error("Backend connection failed:", error);
    }
  };

  return (
    <div className="connection-test">
      <h3>Backend Connection: {status}</h3>
      {backendInfo && (
        <div>
          <p>Message: {backendInfo.message}</p>
          <p>Environment: {backendInfo.environment}</p>
          <p>Frontend URL: {backendInfo.frontendUrl}</p>
          <p>API URL: {import.meta.env.VITE_API_URL}</p>
        </div>
      )}
      {status === "error" && (
        <p>Cannot connect to backend at {import.meta.env.VITE_API_URL}</p>
      )}
    </div>
  );
};

export default ConnectionTest;
