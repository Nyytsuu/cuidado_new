import logo from '../img/logo.png';
import './logotag.css';
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;1,400;1,700&display=swap" rel="stylesheet"></link>
function Logotag() {
    return (
        <div className="logotag">
            <div className="logo-tag">
            <h1 className="h1">JOIN US TODAY!</h1>
            <p className="subtitle">Sign up to check your <br></br> symptoms, 
                book <br></br> appointments, and manage <br></br> your health with ease.</p>
            </div>
        <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
        </div>
        </div>

    );
}
export default Logotag;