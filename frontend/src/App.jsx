import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appel from './pages/Appel';
import Commandes from './pages/Commandes';
import HistoriqueCommandes from './pages/HistoriqueCommandes';
import CommandeDetail from './pages/CommandeDetail';
import NouvelleCommande from './pages/NouvelleCommande';
import PreparationColis from './pages/PreparationColis';
import AtelierStyliste from './pages/AtelierStyliste';
import AtelierCouturier from './pages/AtelierCouturier';
import Stock from './pages/Stock';
import Modeles from './pages/Modeles';
import Livraisons from './pages/Livraisons';
import CaisseLivreurs from './pages/CaisseLivreurs';
import Performances from './pages/Performances';
import Utilisateurs from './pages/Utilisateurs';
import Layout from './components/Layout';

// Route protégée
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Appel - Appelants, Gestionnaires, Admins */}
          <Route path="appel" element={
            <ProtectedRoute allowedRoles={['appelant', 'gestionnaire', 'administrateur']}>
              <Appel />
            </ProtectedRoute>
          } />
          
          {/* Commandes - Appelants, Gestionnaires, Admins */}
          <Route path="commandes" element={
            <ProtectedRoute allowedRoles={['appelant', 'gestionnaire', 'administrateur']}>
              <Commandes />
            </ProtectedRoute>
          } />
          <Route path="commandes/nouvelle" element={
            <ProtectedRoute allowedRoles={['appelant', 'gestionnaire', 'administrateur']}>
              <NouvelleCommande />
            </ProtectedRoute>
          } />
          <Route path="commandes/:id" element={<CommandeDetail />} />
          
          {/* Historique Complet - Gestionnaires, Admins */}
          <Route path="historique" element={
            <ProtectedRoute allowedRoles={['gestionnaire', 'administrateur']}>
              <HistoriqueCommandes />
            </ProtectedRoute>
          } />
          
          {/* Préparation Colis - Gestionnaires, Admins */}
          <Route path="preparation-colis" element={
            <ProtectedRoute allowedRoles={['gestionnaire', 'administrateur']}>
              <PreparationColis />
            </ProtectedRoute>
          } />
          
          {/* Atelier - Stylistes */}
          <Route path="atelier/styliste" element={
            <ProtectedRoute allowedRoles={['styliste', 'administrateur']}>
              <AtelierStyliste />
            </ProtectedRoute>
          } />
          
          {/* Atelier - Couturiers */}
          <Route path="atelier/couturier" element={
            <ProtectedRoute allowedRoles={['couturier', 'administrateur']}>
              <AtelierCouturier />
            </ProtectedRoute>
          } />
          
          {/* Stock */}
          <Route path="stock" element={
            <ProtectedRoute allowedRoles={['administrateur']}>
              <Stock />
            </ProtectedRoute>
          } />
          
          {/* Modèles */}
          <Route path="modeles" element={
            <ProtectedRoute allowedRoles={['administrateur']}>
              <Modeles />
            </ProtectedRoute>
          } />
          
          {/* Livraisons */}
          <Route path="livraisons" element={
            <ProtectedRoute allowedRoles={['livreur', 'gestionnaire', 'administrateur']}>
              <Livraisons />
            </ProtectedRoute>
          } />
          
          {/* Caisse Livreurs */}
          <Route path="caisse-livreurs" element={
            <ProtectedRoute allowedRoles={['gestionnaire', 'administrateur']}>
              <CaisseLivreurs />
            </ProtectedRoute>
          } />
          
          {/* Performances */}
          <Route path="performances" element={
            <ProtectedRoute allowedRoles={['administrateur']}>
              <Performances />
            </ProtectedRoute>
          } />
          
          {/* Utilisateurs */}
          <Route path="utilisateurs" element={
            <ProtectedRoute allowedRoles={['gestionnaire', 'administrateur']}>
              <Utilisateurs />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;




