import '../styles/styles.css'
import '../styles/home.css'
import { BrowserRouter, Route, Routes, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import SignUp from './view/User/SignUp'
import LogIn from './view/User/LogIn'
import AccountManagement from './view/User/AccountManagement'
import RecuperarContraseña from './view/User/RecuperarContraseña'
import LogOut from './view/User/LogOut'
import NewPlace from './view/Place/NewPlace'
import ListPlaces from './view/Place/ListPlaces'
import EditPlace from './view/Place/EditPlace'
import ViewPlace from './view/Place/ViewPlace'
import VehiclesPage from './view/Vehicle/VehiclesPage'
import SearchRoute from './view/Route/Searchroute'
import RouteDetails from './view/Route/RouteDetails'
import NewRoute from './view/Route/NewRoute'
import ListRoutes from './view/Route/ListRoutes'
import EditRoute from './view/Route/EditRoute'
import Settings from './view/User/Settings'
import { Home } from './view/home/Home'
import { useAuth } from './core/context/AuthContext';
import AppNav from './view/components/AppNav';
import AppFooter from "./view/components/AppFooter";
import { useEffect } from 'react';
import { energyPriceGateway } from "./data/provider/EnergyPriceGateway";

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    energyPriceGateway.prefetch().catch((err) => {
      console.warn('Prefetch energy prices failed (app-level)', err);
    });
  }, []);

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
            <Route path="/logout" element={<LogOut />} />
            <Route path="/places/new" element={<NewPlace />} />
            <Route path="/places/edit/:placeId" element={<EditPlace />} />
            <Route path="/places/view/:placeId" element={<ViewPlace />} />
            <Route path="/places" element={<ListPlaces />} />
            <Route path="/mobilitymethods" element={<VehiclesPage />} />
            <Route path="/searchroute" element={<SearchRoute />} />
            <Route path="/routedetails" element={<RouteDetails />} />
            <Route path="/newroute" element={<NewRoute />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/vehicles" element={<VehiclesPage />}/>
            <Route path="/routes" element={<ListRoutes />}/>
            <Route path="/routes/details/:routeId" element={<RouteDetails />} />
            <Route path="/routes/new" element={<NewRoute />} />
            <Route path="/routes/edit/:routeId" element={<EditRoute />} />
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



const PrivateLayout = () => {
  useEffect(() => {
    energyPriceGateway.prefetch().catch((err) => {
      console.warn('Prefetch energy prices failed', err);
    });
  }, []);

  return (
    <>
      <AppNav />
      <main className="app-main"><Outlet /></main>
      <AppFooter />
    </>
  );
};

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
