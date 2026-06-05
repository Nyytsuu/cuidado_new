import { useCallback, useEffect, useMemo, useState } from "react";
import SidebarAdmin from "./SidebarAdmin";
import AdminHeader from "./AdminHeader";
import "./AdminDashboard.css";
import "./AdminHeader.css";
import "./AdminTickets.css";
import { apiUrl } from "../sharedBackendFetch";

type Ticket = {
  id: number;
  user_id: number;
  topic: string;
  priority: string;
  subject: string;
  message: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  status: string;
  admin_reply?: string | null;
  replied_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_name?: string | null;
  user_email?: string | null;
};

type TicketFilter = "all" | "open" | "urgent" | "answered";

const getAuthHeaders = (withJson = false) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("admin_token") || "";
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (withJson) headers["Content-Type"] = "application/json";
  return headers;
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toTitle = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const matchesSearch = (
  query: string,
  ...values: Array<string | number | null | undefined>
) =>
  !query ||
  values.some((value) =>
    String(value ?? "").toLowerCase().includes(query)
  );

export default function AdminTickets() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const openCount = tickets.filter((t) => t.status === "open").length;
  const urgentCount = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "closed"
  ).length;
  const answeredCount = tickets.filter(
    (t) => t.status === "answered" || t.status === "closed"
  ).length;

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(apiUrl("/api/admin/support-requests"), {
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as {
        tickets?: Ticket[];
        message?: string;
      };

      if (!res.ok) throw new Error(data.message || "Failed to load support tickets.");

      const list = Array.isArray(data.tickets) ? data.tickets : [];
      setTickets(list);
      setReplyDrafts(
        list.reduce<Record<number, string>>((acc, t) => {
          acc[t.id] = t.admin_reply || "";
          return acc;
        }, {})
      );
    } catch (err) {
      console.error("Admin tickets fetch error:", err);
      setTickets([]);
      setError(err instanceof Error ? err.message : "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "open" && t.status === "open") ||
        (filter === "urgent" && t.priority === "urgent" && t.status !== "closed") ||
        (filter === "answered" &&
          (t.status === "answered" || t.status === "closed"));

      return (
        matchesFilter &&
        matchesSearch(
          query,
          t.user_name,
          t.user_email,
          t.subject,
          t.message,
          t.topic,
          t.admin_reply
        )
      );
    });
  }, [tickets, filter, search]);

  const saveReply = async (ticketId: number, nextStatus?: string) => {
    const reply = String(replyDrafts[ticketId] || "").trim();

    if (reply.length > 2000) {
      setError("Reply must be 2,000 characters or fewer.");
      return;
    }

    try {
      setSavingId(ticketId);
      setError("");
      setMessage("");

      const res = await fetch(
        apiUrl(`/api/admin/support-requests/${ticketId}/reply`),
        {
          method: "PATCH",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ reply, status: nextStatus }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        ticket?: Ticket;
      };

      if (!res.ok) throw new Error(data?.message || "Failed to save reply.");

      if (data.ticket?.id) {
        const updated = data.ticket;
        setTickets((current) =>
          current.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        );
        setReplyDrafts((current) => ({
          ...current,
          [updated.id]: updated.admin_reply || "",
        }));
      } else {
        await fetchTickets();
      }

      setMessage(data.message || "Saved.");
    } catch (err) {
      console.error("Save reply error:", err);
      setError(err instanceof Error ? err.message : "Failed to save reply.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      className={`admin-dashboard-page admin-tickets-page ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
      <SidebarAdmin
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="admin-main tk-main">
        <AdminHeader
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tickets..."
        />

        {/* Hero */}
        <section className="tk-hero">
          <div>
            <span className="tk-eyebrow">Customer Support</span>
            <h1>Support Tickets</h1>
            <p>Read and answer patient support requests from one place.</p>
          </div>
          <button
            type="button"
            className="tk-refresh"
            onClick={() => void fetchTickets()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </section>

        {(message || error) && (
          <div className={`tk-alert ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        {/* Stats */}
        <section className="tk-stats">
          <div className="tk-stat">
            <span>Total Tickets</span>
            <strong>{tickets.length}</strong>
          </div>
          <div className="tk-stat">
            <span>Open</span>
            <strong className={openCount > 0 ? "tk-warn" : ""}>{openCount}</strong>
          </div>
          <div className="tk-stat">
            <span>Urgent</span>
            <strong className={urgentCount > 0 ? "tk-danger" : ""}>{urgentCount}</strong>
          </div>
          <div className="tk-stat">
            <span>Answered</span>
            <strong>{answeredCount}</strong>
          </div>
        </section>

        {/* Panel */}
        <section className="tk-panel">
          <div className="tk-toolbar">
            <div>
              <h2>Ticket Inbox</h2>
              <p>
                {loading
                  ? "Loading tickets…"
                  : `${filtered.length} of ${tickets.length} tickets shown`}
              </p>
            </div>
            <div className="tk-tabs" aria-label="Ticket filters">
              {(["all", "open", "urgent", "answered"] as TicketFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {toTitle(item)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="tk-empty">Loading support tickets…</div>
          ) : filtered.length === 0 ? (
            <div className="tk-empty">
              <strong>No tickets found.</strong>
              <span>
                When patients submit a support request from the Help page, it will
                appear here for you to answer.
              </span>
            </div>
          ) : (
            <div className="tk-list">
              {filtered.map((ticket) => {
                const draft = replyDrafts[ticket.id] ?? "";
                const savedReply = ticket.admin_reply || "";
                const hasChanges = draft.trim() !== savedReply.trim();
                const isSaving = savingId === ticket.id;
                const isClosed = ticket.status === "closed";

                return (
                  <article className="tk-item" key={ticket.id}>
                    <div className="tk-item-head">
                      <div className="tk-requester">
                        <div className="tk-avatar" aria-hidden="true">
                          {(ticket.user_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="tk-requester-info">
                          <strong>{ticket.user_name || "Cuidado user"}</strong>
                          <span>
                            {ticket.user_email || ticket.contact_email || "No email"} ·
                            Ticket #{ticket.id} · {fmtDateTime(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="tk-badges">
                        <span className={`tk-priority ${ticket.priority}`}>
                          {toTitle(ticket.priority)}
                        </span>
                        <span className={`tk-status ${ticket.status}`}>
                          {toTitle(ticket.status)}
                        </span>
                      </div>
                    </div>

                    <div className="tk-meta-row">
                      <span className="tk-topic">{ticket.topic}</span>
                      <h3 className="tk-subject">{ticket.subject}</h3>
                    </div>

                    <p className="tk-message">{ticket.message}</p>

                    {savedReply && (
                      <div className="tk-current-reply">
                        <div>
                          <strong>Your reply</strong>
                          <span>{fmtDateTime(ticket.replied_at)}</span>
                        </div>
                        <p>{savedReply}</p>
                      </div>
                    )}

                    <label className="tk-reply-field">
                      <span>{savedReply ? "Update reply" : "Write a reply"}</span>
                      <textarea
                        value={draft}
                        maxLength={2000}
                        placeholder="Answer the patient's question or explain the next steps…"
                        onChange={(e) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [ticket.id]: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <div className="tk-actions">
                      <span className="tk-count">{draft.trim().length} / 2000</span>
                      <div className="tk-action-btns">
                        {isClosed ? (
                          <button
                            type="button"
                            className="tk-btn tk-ghost"
                            disabled={isSaving}
                            onClick={() => saveReply(ticket.id, "open")}
                          >
                            Reopen
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="tk-btn tk-ghost"
                            disabled={isSaving}
                            onClick={() => saveReply(ticket.id, "closed")}
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          type="button"
                          className="tk-btn tk-solid"
                          disabled={isSaving || (!hasChanges && !!savedReply)}
                          onClick={() => saveReply(ticket.id, "answered")}
                        >
                          {isSaving
                            ? "Saving…"
                            : savedReply
                              ? "Update Reply"
                              : "Send Reply"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
