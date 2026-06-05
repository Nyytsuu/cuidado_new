import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquareText,
  Mic,
  Search,
  Send,
  User,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import { apiUrl } from "../sharedBackendFetch";
import VoiceAssistantPopup from "./VoiceAssistantPopup";
import "./UserHelp.css";

type StoredUser = {
  id?: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type SupportRequest = {
  id: number;
  topic: string;
  priority: string;
  subject: string;
  message?: string | null;
  status: string;
  created_at: string;
  admin_reply?: string | null;
  replied_at?: string | null;
};

type SupportForm = {
  topic: string;
  priority: string;
  subject: string;
  message: string;
  contact_email: string;
  contact_phone: string;
};

type HelpRouteState = {
  focusSupport?: boolean;
  topic?: string;
  subject?: string;
};

const supportTopics = [
  "Account",
  "Appointments",
  "Clinic Search",
  "Notifications",
  "Voice Assistant",
  "Emergency Page",
  "Technical Issue",
  "Other",
];

const faqItems = [
  {
    question: "How do I book an appointment?",
    answer:
      "Open Find Clinics, choose an available clinic, then send an appointment request from the booking popup.",
    category: "Appointments",
  },
  {
    question: "Why is a clinic closed when I try to book?",
    answer:
      "Clinics can set weekly hours and blocked dates. Booking is only allowed when the selected time matches their schedule.",
    category: "Clinic Search",
  },
  {
    question: "Where can I update my profile picture?",
    answer:
      "Open Profile from the header avatar, choose a JPG, PNG, or WEBP image, then save it.",
    category: "Account",
  },
  {
    question: "What should I do if the voice assistant says network?",
    answer:
      "Check that the backend server is running on port 5000, then reload the page and try again.",
    category: "Voice Assistant",
  },
  {
    question: "When should I use the Emergency page?",
    answer:
      "Use it when you need fast access to emergency hotlines, location sharing, or nearby clinics.",
    category: "Emergency Page",
  },
];

const quickLinks = [
  {
    title: "My Appointments",
    description: "View, cancel, or reschedule appointment requests.",
    icon: CalendarDays,
    path: "/appointments",
  },
  {
    title: "Find Clinics",
    description: "Search clinics and request a booking.",
    icon: MapPin,
    path: "/find-clinic",
  },
  {
    title: "Notifications",
    description: "Read appointment and system updates.",
    icon: Bell,
    path: "/notifications",
  },
  {
    title: "My Profile",
    description: "Update your account details and profile photo.",
    icon: User,
    path: "/profile",
  },
  {
    title: "Voice Assistant",
    description: "Ask for health guidance by voice.",
    icon: Mic,
    path: "/voice-assistant",
  },
  {
    title: "Emergency",
    description: "Access hotlines and location support.",
    icon: LifeBuoy,
    path: "/emergency",
  },
];

const getStoredUser = (): StoredUser | null => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? (JSON.parse(storedUser) as StoredUser) : null;
  } catch {
    return null;
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function UserHelp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const supportPanelRef = useRef<HTMLElement | null>(null);

  const currentUser = useMemo(() => getStoredUser(), []);
  const userId = currentUser?.id ? String(currentUser.id) : "";
  const userName = currentUser?.full_name || currentUser?.name || "there";

  const [faqSearch, setFaqSearch] = useState("");
  const [activeFaq, setActiveFaq] = useState("All");
  const [form, setForm] = useState<SupportForm>({
    topic: "Appointments",
    priority: "normal",
    subject: "",
    message: "",
    contact_email: currentUser?.email || "",
    contact_phone: currentUser?.phone || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [highlightSupport, setHighlightSupport] = useState(false);

  const faqCategories = useMemo(
    () => ["All", ...Array.from(new Set(faqItems.map((item) => item.category)))],
    []
  );

  const filteredFaqs = useMemo(() => {
    const keyword = faqSearch.trim().toLowerCase();

    return faqItems.filter((item) => {
      const matchesCategory = activeFaq === "All" || item.category === activeFaq;
      const matchesSearch =
        !keyword ||
        item.question.toLowerCase().includes(keyword) ||
        item.answer.toLowerCase().includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [activeFaq, faqSearch]);

  const loadSupportRequests = useCallback(async () => {
    if (!userId) return;

    try {
      setRequestsLoading(true);
      const res = await fetch(apiUrl(`/api/users/${userId}/support-requests`), {
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error("Failed to load support requests.");
      }

      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadSupportRequests();
  }, [loadSupportRequests]);

  useEffect(() => {
    const state = location.state as HelpRouteState | null;
    if (!state?.focusSupport) return;

    setForm((prev) => ({
      ...prev,
      topic:
        state.topic && supportTopics.includes(state.topic)
          ? state.topic
          : prev.topic,
      subject: state.subject || prev.subject,
    }));
    setHighlightSupport(true);
    supportPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const timer = window.setTimeout(() => {
      setHighlightSupport(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [location.state]);

  const updateForm = (field: keyof SupportForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatusMessage("");
    setErrorMessage("");
  };

  const submitSupportRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      setErrorMessage("Please sign in before sending a support request.");
      return;
    }

    if (form.subject.trim().length < 5) {
      setErrorMessage("Please enter a short subject.");
      return;
    }

    if (form.message.trim().length < 15) {
      setErrorMessage("Please describe the issue with at least 15 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setStatusMessage("");

      const res = await fetch(apiUrl(`/api/users/${userId}/support-requests`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          priority: form.priority,
          subject: form.subject.trim(),
          message: form.message.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit support request.");
      }

      const emailError =
        typeof data.email_error === "string" ? data.email_error.trim() : "";
      setStatusMessage(
        data.email_sent
          ? "Support request submitted and emailed to support."
          : `Support request saved, but the support email was not delivered.${
              emailError ? ` Backend says: ${emailError}` : ""
            }`
      );
      setForm((prev) => ({
        ...prev,
        subject: "",
        message: "",
      }));
      await loadSupportRequests();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit support request."
      );
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className={`user-help-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchPlaceholder="Search site..."
      />

      <main className="user-help-main">
        <section className="help-hero">
          <div>
            <span className="help-kicker">
              <CircleHelp size={18} />
              User help center
            </span>
            <h1>How can we help, {userName}?</h1>
            <p>
              Search common questions, jump to important pages, or send a support
              request that is saved to your account.
            </p>
          </div>
          <button type="button" onClick={() => navigate("/emergency")}>
            <LifeBuoy size={18} />
            Emergency Page
          </button>
        </section>

        <section className="help-layout">
          <div className="help-left">
            <section className="help-panel">
              <div className="help-panel-head">
                <div>
                  <h2>Frequently asked questions</h2>
                  <p>Filter by topic or search for a keyword.</p>
                </div>
                <div className="faq-search">
                  <Search size={18} />
                  <input
                    type="search"
                    value={faqSearch}
                    onChange={(event) => setFaqSearch(event.target.value)}
                    placeholder="Search help..."
                  />
                </div>
              </div>

              <div className="faq-tabs">
                {faqCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={activeFaq === category ? "active" : ""}
                    onClick={() => setActiveFaq(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="faq-list">
                {filteredFaqs.length === 0 ? (
                  <div className="help-empty">No help articles matched your search.</div>
                ) : (
                  filteredFaqs.map((item) => (
                    <article className="faq-item" key={item.question}>
                      <span>{item.category}</span>
                      <h3>{item.question}</h3>
                      <p>{item.answer}</p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="help-panel">
              <div className="help-panel-head">
                <div>
                  <h2>Quick links</h2>
                  <p>Open the page you need without going back to the dashboard.</p>
                </div>
              </div>

              <div className="quick-help-grid">
                {quickLinks.map((item) => {
                  const Icon = item.icon;

                  if (item.title === "Voice Assistant") {
                    return (
                      <VoiceAssistantPopup
                        key={item.title}
                        userId={currentUser?.id ? Number(currentUser.id) : null}
                        className="quick-help-card"
                      >
                        <span>
                          <Icon size={21} />
                        </span>
                        <div>
                          <h3>{item.title}</h3>
                          <p>{item.description}</p>
                        </div>
                      </VoiceAssistantPopup>
                    );
                  }

                  return (
                    <Link className="quick-help-card" to={item.path} key={item.title}>
                      <span>
                        <Icon size={21} />
                      </span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="help-right">
            <section
              className={`help-panel support-form-panel ${
                highlightSupport ? "support-panel-highlight" : ""
              }`}
              id="contact-support"
              ref={supportPanelRef}
            >
              <div className="help-panel-title">
                <MessageSquareText size={20} />
                <h2>Contact support</h2>
              </div>

              {statusMessage && <div className="help-alert success">{statusMessage}</div>}
              {errorMessage && <div className="help-alert error">{errorMessage}</div>}

              <form className="support-form" onSubmit={submitSupportRequest}>
                <label>
                  Topic
                  <select
                    value={form.topic}
                    onChange={(event) => updateForm("topic", event.target.value)}
                  >
                    {supportTopics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) => updateForm("priority", event.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>

                <label className="span-2">
                  Subject
                  <input
                    value={form.subject}
                    onChange={(event) => updateForm("subject", event.target.value)}
                    placeholder="Short summary"
                  />
                </label>

                <label className="span-2">
                  Message
                  <textarea
                    value={form.message}
                    onChange={(event) => updateForm("message", event.target.value)}
                    placeholder="Tell us what happened and what you expected."
                    rows={5}
                  />
                </label>

                <label>
                  Reply email
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(event) => updateForm("contact_email", event.target.value)}
                    placeholder="email@example.com"
                  />
                </label>

                <label>
                  Phone
                  <input
                    value={form.contact_phone}
                    onChange={(event) => updateForm("contact_phone", event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <button className="support-submit-btn" type="submit" disabled={submitting}>
                  <Send size={17} />
                  {submitting ? "Sending..." : "Send Request"}
                </button>
              </form>
            </section>

            <section className="help-panel recent-requests-panel">
              <div className="help-panel-title">
                <ClipboardList size={20} />
                <h2>Recent requests</h2>
              </div>

              {requestsLoading ? (
                <div className="help-empty">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="help-empty">No support requests yet.</div>
              ) : (
                <div className="request-list">
                  {requests.map((request) => (
                    <button
                      type="button"
                      className="request-card"
                      key={request.id}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="request-card-main">
                        <span className="request-card-topic">{request.topic}</span>
                        <h3>{request.subject}</h3>
                        <p className="request-card-date">
                          {formatDate(request.created_at)}
                        </p>
                      </div>
                      <div className="request-card-side">
                        <strong className={`request-status ${request.status.toLowerCase()}`}>
                          {request.status}
                        </strong>
                        {request.admin_reply ? (
                          <span className="request-replied-tag">
                            <MessageSquareText size={12} /> Reply
                          </span>
                        ) : null}
                        <span className="request-card-chevron" aria-hidden="true">
                          ›
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="help-panel help-contact-card">
              <Mail size={22} />
              <div>
                <h2>Need account details?</h2>
                <p>Open your profile to update your name, email, phone, and picture.</p>
              </div>
              <Link to="/profile">
                <User size={17} />
                My Profile
              </Link>
            </section>
          </aside>
        </section>
      </main>

      {selectedRequest && (
        <div
          className="request-modal-overlay"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="request-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Support request details"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="request-modal-close"
              onClick={() => setSelectedRequest(null)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="request-modal-head">
              <span className="request-card-topic">{selectedRequest.topic}</span>
              <h3>{selectedRequest.subject}</h3>
              <div className="request-modal-meta">
                <strong className={`request-status ${selectedRequest.status.toLowerCase()}`}>
                  {selectedRequest.status}
                </strong>
                <span className="request-modal-priority">
                  {selectedRequest.priority
                    ? `${selectedRequest.priority.charAt(0).toUpperCase()}${selectedRequest.priority.slice(1)} priority`
                    : "Normal priority"}
                </span>
                <span>{formatDate(selectedRequest.created_at)}</span>
              </div>
            </div>

            <div className="request-modal-body">
              <div className="request-modal-section">
                <h4>Your message</h4>
                <p>{selectedRequest.message || "No message provided."}</p>
              </div>

              {selectedRequest.admin_reply ? (
                <div className="request-modal-section request-modal-reply">
                  <h4>
                    <MessageSquareText size={15} /> Support response
                    {selectedRequest.replied_at
                      ? ` · ${formatDate(selectedRequest.replied_at)}`
                      : ""}
                  </h4>
                  <p>{selectedRequest.admin_reply}</p>
                </div>
              ) : (
                <div className="request-modal-waiting">
                  <LifeBuoy size={16} />
                  <span>
                    Our team is reviewing your request. A reply will appear here
                    once they respond.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
