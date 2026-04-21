import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ClientDashboard from './pages/ClientDashboard';
import AdminArea from './pages/AdminArea';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ClientDashboard />} />
          <Route path="admin" element={<AdminArea />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
