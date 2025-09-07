// import { Toaster } from "@/components/ui/toaster";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import VerifyEmail from "./pages/VerifyEmail";
import GitHubConfirmation from "./pages/GitHubConfirmation";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import OpenRoute from "./components/auth/OpenRoute";
import Home from "./components/dashboard/Home";
import TemplateSelector from "./components/dashboard/TemplateSelector";
import CodingPage from "./pages/CodingPage";
import InvitePage from "./pages/InvitePage";
import ViewProject from "./components/dashboard/ViewProject";
import SharedWithMe from "./components/dashboard/SharedWithMe";
import Settings from "./components/dashboard/Settings";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ForgotPasswordRequestPage from "./pages/ForgotPasswordRequestPage";

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

            <Route path="" element={<Home/>}/>
            <Route path="home" element={<Home/>}/>
            <Route path="createProject" element={<TemplateSelector/>}/>
            <Route path="viewProjects" element={<ViewProject/>}/>
            <Route path="sharedProjects" element={<SharedWithMe/>}/>
            <Route path="settings" element={<Settings/>}/>

          </Route>
          <Route path='/verify-email' element={<VerifyEmail/>} />
          <Route path='/github-confirmation' element={<GitHubConfirmation/>} />
          <Route path='/change-password/:token' element={<ChangePasswordPage/>} />
          <Route path='/reset-password/:token' element={<ForgotPasswordPage/>} />
          <Route path='/forgot-password' element={<ForgotPasswordRequestPage/>} />

          <Route path="/coding/:projectId" element={<CodingPage/>}/>
          <Route path="/invite/:token" element={<InvitePage/>}/>

          <Route path="*" element={<NotFound />} />
        </Routes>
);

export default App;
