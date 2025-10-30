import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <h2>Welcome, {user?.name}!</h2>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
      
      <div className="dashboard-content">
        <p>This is your dashboard. Add your POS features here.</p>
      </div>
    </div>
  );
};

export default Dashboard;