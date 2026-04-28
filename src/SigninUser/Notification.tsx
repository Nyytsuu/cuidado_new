import { useMemo, useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./Notification.css";

type NotificationItem = {
  id: number;
  icon: string;
  title: string;
  message: string;
  time: string;
  category: string;
  unread: boolean;
};

export default function Notifications() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("All");
  const [filter, setFilter] = useState("All");

  const notifications: NotificationItem[] = [
    {
      id: 1,
      icon: "📅",
      title: "Upcoming Appointment Reminder",
      message:
        "You have an appointment with Dr. Sarah Williams on May 16, 2024 at 10:30 AM.",
      time: "2 min ago",
      category: "Appointments",
      unread: true,
    },
    {
      id: 2,
      icon: "🧪",
      title: "Lab Test Results Available",
      message:
        "Your lab test results from City Health Center are now available.",
      time: "1 hour ago",
      category: "System",
      unread: true,
    },
    {
      id: 3,
      icon: "💊",
      title: "Prescription Ready for Pickup",
      message:
        "Your prescription order from CareClinic is ready for pickup.",
      time: "3 hours ago",
      category: "Appointments",
      unread: true,
    },
    {
      id: 4,
      icon: "🔔",
      title: "Appointment Rescheduled",
      message:
        "Your appointment with Dr. Michael Lee has been rescheduled to May 28, 2024.",
      time: "Yesterday",
      category: "Appointments",
      unread: true,
    },
    {
      id: 5,
      icon: "📣",
      title: "Health Tip of the Week",
      message:
        "Stay hydrated and eat balanced meals to boost immunity.",
      time: "Yesterday",
      category: "Promotions",
      unread: false,
    },
    {
      id: 6,
      icon: "👤",
      title: "Profile Updated Successfully",
      message:
        "Your profile information has been updated successfully.",
      time: "May 13, 2024",
      category: "System",
      unread: false,
    },
    {
      id: 7,
      icon: "🛡️",
      title: "Security Alert",
      message:
        "New login detected on Chrome (Windows) at 10:24 AM.",
      time: "May 12, 2024",
      category: "System",
      unread: false,
    },
  ];

  const filteredNotifications = useMemo(() => {
    let data = notifications;

    if (activeTab === "Unread") {
      data = data.filter((item) => item.unread);
    }

    if (
      activeTab !== "All" &&
      activeTab !== "Unread"
    ) {
      data = data.filter(
        (item) => item.category === activeTab
      );
    }

    if (filter !== "All") {
      if (filter === "Unread") {
        data = data.filter((item) => item.unread);
      } else {
        data = data.filter(
          (item) => item.category === filter
        );
      }
    }

    return data;
  }, [activeTab, filter]);

  const getCount = (name: string) => {
    if (name === "All") return notifications.length;

    if (name === "Unread") {
      return notifications.filter(
        (item) => item.unread
      ).length;
    }

    return notifications.filter(
      (item) => item.category === name
    ).length;
  };

  return (
    <div
      className={`browse-health-page ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="browse-page-content">
        <main className="browse-health-main">
          <section className="health-browser-layout notifications-layout">

            {/* LEFT SIDE */}
            <section className="health-content-card">
              <div className="content-box">
                <h1 className="content-title">
                  Notifications
                </h1>

                <p className="content-subtitle">
                  Stay updated with your latest alerts
                  and important updates.
                </p>

                {/* UPDATED HEADER */}
                <div className="tabs-header">
                  <div className="category-tabs">
                    {[
                      "All",
                      "Unread",
                      "Appointments",
                      "System",
                      "Promotions",
                    ].map((tab) => (
                      <button
                        key={tab}
                        className={`category-tab ${
                          activeTab === tab
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setActiveTab(tab)
                        }
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="mark-read">
                    ✓ Mark all as read
                  </div>
                </div>
              </div>

              <div className="content-box category-section-box">
                <div className="notification-list">
                  {filteredNotifications.map(
                    (item) => (
                      <div
                        className="notification-card"
                        key={item.id}
                      >
                        <div className="notification-left">
                          <div className="notification-icon">
                            {item.icon}
                          </div>

                          <div>
                            <div className="topic-title">
                              {item.title}
                            </div>

                            <div className="topic-subtitle">
                              {item.message}
                            </div>
                          </div>
                        </div>

                        <div className="notification-right">
                          <span>{item.time}</span>

                          {item.unread && (
                            <span className="green-dot"></span>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT SIDE */}
            <aside className="health-sidebar-card">
              <div className="sidebar-box">
                <h3 className="group-title">
                  Notification Filter
                </h3>

                {[
                  "All",
                  "Unread",
                  "Appointments",
                  "System",
                  "Promotions",
                ].map((item) => (
                  <button
                    key={item}
                    className={`system-item ${
                      filter === item
                        ? "active-filter"
                        : ""
                    }`}
                    onClick={() =>
                      setFilter(item)
                    }
                  >
                    <span className="system-name">
                      {item}
                    </span>

                    <span className="badge">
                      {getCount(item)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="sidebar-box">
                <h3 className="group-title">
                  Notification Preferences
                </h3>

                <p className="topic-subtitle">
                  Manage how you receive
                  notifications
                </p>

                <button className="voice-start-btn">
                  Manage Preferences
                </button>
              </div>

              <div className="sidebar-box">
                <h3 className="group-title">
                  Need Help?
                </h3>

                <p className="topic-subtitle">
                  If you have any questions
                  about notifications, we're
                  here to help.
                </p>

                <button className="voice-start-btn">
                  Contact Support
                </button>
              </div>

              <div className="sidebar-box promo-box">
                <h3 className="group-title">
                  Never miss an update!
                </h3>

                <p className="topic-subtitle">
                  Enable push notifications
                  to stay informed in
                  real-time.
                </p>

                <button className="voice-start-btn">
                  Enable Notifications
                </button>
              </div>
            </aside>

          </section>
        </main>
      </div>
    </div>
  );
}