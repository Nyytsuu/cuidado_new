import type { Dispatch, SetStateAction } from "react";
import "./Sidebar.css";

import userIcon from "../img/user.png";
import bookIcon from "../img/book.png";
import clockIcon from "../img/time.png";
import homeIcon from "../img/home.png";
import disIcon from "../img/virus.png";
import aboutIcon from "../img/information-button.png";
import phoneIcon from "../img/phone.png";
import logoutIcon from "../img/logout.png";

interface SidebarProps {
    sidebarExpanded: boolean;
    setSidebarExpanded: Dispatch<SetStateAction<boolean>>;
    profileOpen: boolean;
    setProfileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({
    sidebarExpanded,
    setSidebarExpanded,
    profileOpen,
    setProfileOpen,
}: SidebarProps) {
    return (
        <aside
            className={`sidebar ${sidebarExpanded ? "expanded" : ""}`}
            onClick={() => setSidebarExpanded((v) => !v)}
            style={{ cursor: "pointer" }}
        >
            <div
                className={`sidebar-item ${profileOpen ? "open" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="sidebar-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setProfileOpen((v) => !v);
                    }}
                >
                    <img src={userIcon} alt="Profile icon" />
                    <span>PROFILE</span>
                </button>

                <div className="submenu" onClick={(e) => e.stopPropagation()}>
                    <a href="#">
                        <img src={bookIcon} alt="Archive" />
                        <span className="sub">ARCHIVE</span>
                    </a>
                    <a href="#">
                        <img src={clockIcon} alt="History" />
                        <span className="sub">HISTORY</span>
                    </a>
                </div>
            </div>

            <div className="sidebar-item" onClick={(e) => e.stopPropagation()}>
                <a href="#">
                    <img src={homeIcon} alt="Homepage icon" />
                    <span>HOMEPAGE</span>
                </a>
            </div>

            <div className="sidebar-item" onClick={(e) => e.stopPropagation()}>
                <a href="#">
                    <img src={disIcon} alt="Disease icon" />
                    <span>DISEASE</span>
                </a>
            </div>

            <div className="sidebar-item" onClick={(e) => e.stopPropagation()}>
                <a href="#">
                    <img src={aboutIcon} alt="About us icon" />
                    <span>ABOUT&nbsp;US</span>
                </a>
            </div>

            <div className="sidebar-item" onClick={(e) => e.stopPropagation()}>
                <a href="#">
                    <img src={phoneIcon} alt="Contact us icon" />
                    <span>CONTACT US</span>
                </a>
            </div>

            <div className="sidebar-item logout" onClick={(e) => e.stopPropagation()}>
                <a href="#">
                    <img src={logoutIcon} alt="Logout icon" />
                    <span>LOGOUT</span>
                </a>
            </div>
        </aside>
    );
}