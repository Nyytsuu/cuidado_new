import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import ConditionDetails from "./SigninUser/ConditionDetails";
import Signup from "./SignupUser/Signup";
import Signin from "./SigninUser/Signin";
import ForgetPass from "./SigninUser/Forgetpass";
import LandingPage from "./SigninUser/Landingpage";
import Categories from "./Categories/Categories";
import Changepass from "./SigninUser/Changepass";
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
import SplashScreen from "./SigninUser/SplashScreen"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgetPass />} />
        <Route path="/change-password" element={<Changepass />} />
        <Route path="/landingpage" element={<LandingPage/>} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/browse-health" element={<BrowseHealth />} />
        <Route path="/health/body-system/:slug" element={<BodySystemDetails />} />
        <Route path="/health/condition/:slug" element={<ConditionDetails />} />
        <Route path="/symptom-checker" element={<SympCheck />} />
        <Route path="/appointments" element={<UserAppointment />} />
        <Route path="/find-clinic" element={<FindClinic />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/notifications" element={<Notifications />} />
        
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route path="/bmi-calculator" element={<BMICalculator />} />
        <Route path="/stress-index" element={<StressIndex />} />
        <Route path="/voice-assistant" element={<UserVoiceAssistant />} />
        <Route path="/emergency" element={<UserEmergency />} />
        <Route path="/emergency-guide" element={<UserEmergency />} />
        <Route path="/help" element={<UserHelp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
