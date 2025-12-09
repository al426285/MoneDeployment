import '../styles/styles.css'
import '../styles/home.css'
import { BrowserRouter, Route, Routes, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import SignUp from './view/User/SignUp'
import LogIn from './view/User/LogIn'
import AccountManagement from './view/User/AccountManagement'
import RecuperarContraseña from './view/User/RecuperarContraseña'
import LogOut from './view/User/LogOut'
import {Home} from './view/home/Home'
import { useAuth } from './core/context/AuthContext';
import AppNav from './view/components/AppNav';
import AppFooter from './view/components/AppFooter';
import { useEffect } from 'react';

function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <BrowserRouter>
      <div className="app-root">
      <Routes>
        {/* Ruta pública */}
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/recover-password" element={<RecuperarContraseña />} />
        <Route path="/login" element={user ? <Navigate to="/searchroute" replace /> : <LogIn />} />

        {/* Rutas protegidas */}
        <Route element={<RequireAuth />}>
          <Route element={<PrivateLayout />}>
            <Route path="/account" element={<AccountManagement />} />
          </Route>
        </Route>

        {/* Fallback para rutas no encontradas */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
      </div>
    </BrowserRouter>
  )
}

const RequireAuth = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};



const PrivateLayout = () => (
  <>
    <AppNav /> 
    <main className="app-main"><Outlet /></main>
    <AppFooter/>
  </>
);

const NotFoundRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      if (window.history && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      navigate('/', { replace: true });
    }
  }, [navigate]);
  return null;
};

export default App
