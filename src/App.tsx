import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
//user  Stashed changes
import Signup from "./SignupUser/Signup";
import Signin from "./SigninUser/Signin";
import ForgetPass from "./SigninUser/Forgetpass";
import LandingPage from "./SigninUser/Landingpage";
import Categories from "./Categories/Categories";
import Changepass from "./SigninUser/Changepass";
import VerifyOtp from "./SigninUser/VerifyOtp";

// admin
import AdminUser from "./admin/AdminUser";
import AdminDashboard from "./admin/AdminDashboard";
import AdminServices from "./admin/AdminServices";
import AdminAppoint from "./admin/AdminAppoint";
import AdminClinic from "./admin/AdminClinic";
//clinic
import ClinicSignup from "./Clinic/ClinicSignup";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgetPass />} />
        <Route path="/change-password" element={<Changepass />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/landing" element={<LandingPage />} />
        
        
        {/* clinic */}
        <Route path="/Clinicsignup" element={<ClinicSignup />} />
        {/* admin */}
      <Route path="/admin/users" element={<AdminUser />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/services" element={<AdminServices />} />
      <Route path="/admin/appointments" element={<AdminAppoint />} />
      <Route path="/admin/clinics" element={<AdminClinic />} />
      
      </Routes>
    </BrowserRouter>
  );
}

export default App;