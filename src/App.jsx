// src/App.jsx
import { AuthProvider } from './contexts/AuthContext';
import ConnectionTest from './components/ConnectionTest';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <ConnectionTest />
      {!isAuthenticated ? <Login /> : <Dashboard />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;