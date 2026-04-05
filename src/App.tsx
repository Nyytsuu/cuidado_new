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
import BrowseHealth from "./SigninUser/BrowseHealth";
import Cardio from "./SigninUser/Cardio";
import SympCheck from "./SigninUser/SympCheck";
import UserAppointment from "./SigninUser/UserAppointment";
import FindClinic from "./SigninUser/FindClinic";
import Homepage from "./SigninUser/Homepage";
import BMICalculator from "./SigninUser/BMICalculator";
import StressIndex from "./SigninUser/StressIndex";

// admin
import AdminProtectedRoute from "./routes/AdminProtectedRoute";
import AdminUser from "./admin/AdminUser";
import AdminDashboard from "./admin/AdminDashboard";
import AdminServices from "./admin/AdminServices";
import AdminAppoint from "./admin/AdminAppoint";
import AdminClinic from "./admin/AdminClinic";
import AdminProfile from "./admin/AdminProfile";
import AdminReport from "./admin/AdminReport";
import AdminConditionalManagement  from "./admin/AdminConditionManagement";
import AdminSymptomsManagement from "./admin/AdminSymptomsManagement";
import AdminConditionSymptomMapping from "./admin/AdminConditionSymptomMapping";
//clinic
import ClinicSignup from "./Clinic/ClinicSignup";
import ClinicDashboard from "./Clinic/ClinicDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route>
        <Route path="/" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgetPass />} />
        <Route path="/change-password" element={<Changepass />} />
        <Route path="/landingpage" element={<LandingPage/>} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/browse-health" element={<BrowseHealth />} />
        <Route path="/cardio" element={<Cardio />} />
        <Route path="/symptom-checker" element={<SympCheck />} />
        <Route path="/appointments" element={<UserAppointment />} />
        <Route path="/find-clinic" element={<FindClinic />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/bmi-calculator" element={<BMICalculator />} />
        <Route path="/stress-index" element={<StressIndex />} />
        
        </Route>
        {/* clinic */}
        <Route path="/Clinicsignup" element={<ClinicSignup />} />
        <Route path="/clinic/dashboard" element={<ClinicDashboard />} />

        {/* admin */}
        <Route element={<AdminProtectedRoute/>}>
      <Route path="/admin/users" element={<AdminUser />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUser />} />
      <Route path="/admin/services" element={<AdminServices />} />
      <Route path="/admin/appointments" element={<AdminAppoint />} />
      <Route path="/admin/clinics" element={<AdminClinic />} />
      <Route path="/admin/settings" element={<AdminProfile/>} />
      <Route path="/admin/reports" element={<AdminReport />} />
      <Route path="/admin/conditional" element={<AdminConditionalManagement />} />
      <Route path="/admin/symptoms" element={ <AdminSymptomsManagement />} />
      <Route path="/admin/condition-symptom-mapping" element={<AdminConditionSymptomMapping />} />
        </Route>
      
      </Routes>
    </BrowserRouter>
  );
}

export default App;