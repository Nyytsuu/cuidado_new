import { BrowserRouter, Routes, Route} from "react-router-dom";
import "./App.css";
import UserProtectedRoute from "./routes/UserProtectedRoute";
import ConditionDetails from "./SigninUser/ConditionDetails";
import Signup from "./SignupUser/Signup";
import Signin from "./SigninUser/Signin";
import LandingPage from "./SigninUser/Landingpage";
import Categories from "./Categories/Categories";
import VerifyOtp from "./SigninUser/VerifyOtp";
import BrowseHealth from "./SigninUser/BrowseHealth";
import BodySystemDetails from "./SigninUser/BodySystemDetails";
import SympCheck from "./SigninUser/SympCheck"; 
import UserAppointment from "./SigninUser/UserAppointment";
import FindClinic from "./SigninUser/FindClinic";
import Homepage from "./SigninUser/Homepage";
import Notifications from "./SigninUser/Notification";
import Profile from "./SigninUser/UserProfile";
import UserSettings from "./SigninUser/UserSettings";
import BMICalculator from "./SigninUser/BMICalculator";
import StressIndex from "./SigninUser/StressIndex"  ;
import UserVoiceAssistant from "./SigninUser/UserVoiceAssistant";
import UserEmergency from "./SigninUser/UserEmergency";
import UserHelp from "./SigninUser/UserHelp";
import Cardio from "./SigninUser/Cardio";

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
import ClinicProtectedRoute from "./routes/ClinicProtectedRoute";
import ClinicDashboard from "./Clinic/ClinicDashboard";
import ClinicAppoint from "./Clinic/ClinicAppoint";
import Patients from "./Clinic/Patient";
import Services from "./Clinic/services";
import ClinicProfile from "./Clinic/ClinicProfile";
import ClinicSettings from "./Clinic/ClinicSettings";
import Schedule from "./Clinic/Schedule";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/landingpage" element={<LandingPage/>} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/landing" element={<LandingPage />} />

        
        <Route element={<UserProtectedRoute />}>
        <Route path="/browse-health" element={<BrowseHealth />} />
        <Route path="/health/body-system/:slug" element={<BodySystemDetails />} />
        <Route path="/health/condition/:slug" element={<ConditionDetails />} />
        <Route path="/symptom-checker" element={<SympCheck />} />
        <Route path="/appointments" element={<UserAppointment />} />
        <Route path="/find-clinic" element={<FindClinic />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/notifications" element={<Notifications />} />
       <Route path="/cardio" element={<Cardio />} /> 
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route path="/bmi-calculator" element={<BMICalculator />} />
        <Route path="/stress-index" element={<StressIndex />} />
        <Route path="/voice-assistant" element={<UserVoiceAssistant />} />
        <Route path="/emergency" element={<UserEmergency />} />
        <Route path="/emergency-guide" element={<UserEmergency />} />
        <Route path="/help" element={<UserHelp />} />
        </Route>
        {/* clinic */}
    <Route element={<ClinicProtectedRoute/>}>
<Route path="/clinic/dashboard" element={<ClinicDashboard />} />
<Route path="/clinic/appointments" element={<ClinicAppoint />} />
<Route path="/clinic/patients" element={<Patients />} />
<Route path="/clinic/services" element={<Services />} /> 
<Route path="/clinic/profile" element={<ClinicProfile />} />
<Route path="/clinic/settings" element={<ClinicSettings />} />
<Route path="/clinic/schedule" element={<Schedule />} />
</Route>

        {/* admin */}
        <Route element={<AdminProtectedRoute/>}>
      <Route path="/admin/users" element={<AdminUser />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
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
