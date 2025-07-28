// import { Toaster } from "@/components/ui/toaster";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import VerifyEmail from "./pages/VerifyEmail";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import OpenRoute from "./components/auth/OpenRoute";
import Home from "./components/dashboard/Home";
import TemplateSelector from "./components/dashboard/TemplateSelector";
import CodingPage from "./pages/CodingPage";

const App = () => (
        <Routes>
          <Route path="/" element={
            <OpenRoute>
              <Index />
            </OpenRoute>
          } />
          <Route path="/login" element={
            <OpenRoute>
              <Login />
            </OpenRoute>
          } />
          <Route path="/signup" element={
            <OpenRoute>
              <Signup />
            </OpenRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } >

            <Route path="home" element={<Home/>}/>
            <Route path="createProject" element={<TemplateSelector/>}/>

          </Route>
          <Route path='/verify-email' element={<VerifyEmail/>} />

          <Route path="/coding/:projectId" element={<CodingPage/>}/>

          <Route path="*" element={<NotFound />} />
        </Routes>
);

export default App;
