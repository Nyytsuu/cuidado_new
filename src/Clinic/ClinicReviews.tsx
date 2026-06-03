import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  MessageSquareText,
  RefreshCw,
  Reply,
  Star,
  StarHalf,
} from "lucide-react";
import SidebarClinic from "./SidebarClinic";
import "./ClinicReviews.css";
import { apiUrl } from "../sharedBackendFetch";

type ClinicReview = {
  id: number;
  appointment_id?: number;
  clinic_id?: number;
  user_id?: number;
  rating: number | string;
  feedback?: string | null;
  clinic_reply?: string | null;
  clinic_reply_updated_at?: string | null;
  reviewer_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ClinicFeedbackResponse = {
  average_rating?: number | null;
  rating_count?: number;
  reviews?: ClinicReview[];
  message?: string;
};

type ReviewFilter = "all" | "needs-reply" | "replied";

const getStoredClinicId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user?.role === "clinic" && user?.id) {
      return Number(user.id);
    }

    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");

    if (role === "clinic" && userId) {
      return Number(userId);
    }
  } catch {
    return 1;
  }

  return 1;
};

const getAuthHeaders = (withJson = false) => {
  const token = localStorage.getItem("token") || localStorage.getItem("clinic_token");
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (withJson) headers["Content-Type"] = "application/json";

  return headers;
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "-";

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

const normalizeRating = (value: number | string) => {
  const rating = Number(value);
  return Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
};

const matchesSearch = (
  query: string,
  ...values: Array<string | number | null | undefined>
) =>
  !query ||
  values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(query)
  );

export default function ClinicReviews() {
  const layoutFixed = useRef(false);
  const clinicId = useMemo(() => getStoredClinicId(), []);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [reviews, setReviews] = useState<ClinicReview[]>([]);
  const [ratingCount, setRatingCount] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingReplyId, setSavingReplyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const repliedCount = reviews.filter((review) =>
    String(review.clinic_reply || "").trim()
  ).length;
  const needsReplyCount = Math.max(reviews.length - repliedCount, 0);

  useLayoutEffect(() => {
    if (layoutFixed.current) return;
    layoutFixed.current = true;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const previous = {
      htmlHeight: html.style.height,
      htmlOverflowY: html.style.overflowY,
      bodyHeight: body.style.height,
      bodyOverflowY: body.style.overflowY,
      bodyDisplay: body.style.display,
      bodyAlignItems: body.style.alignItems,
      bodyJustifyContent: body.style.justifyContent,
      rootHeight: root?.style.height ?? "",
      rootMinHeight: root?.style.minHeight ?? "",
      rootWidth: root?.style.width ?? "",
    };

    html.style.height = "auto";
    html.style.overflowY = "auto";
    body.style.height = "auto";
    body.style.overflowY = "auto";
    body.style.display = "block";
    body.style.alignItems = "stretch";
    body.style.justifyContent = "flex-start";

    if (root) {
      root.style.height = "auto";
      root.style.minHeight = "100vh";
      root.style.width = "100%";
    }

    return () => {
      layoutFixed.current = false;
      html.style.height = previous.htmlHeight;
      html.style.overflowY = previous.htmlOverflowY;
      body.style.height = previous.bodyHeight;
      body.style.overflowY = previous.bodyOverflowY;
      body.style.display = previous.bodyDisplay;
      body.style.alignItems = previous.bodyAlignItems;
      body.style.justifyContent = previous.bodyJustifyContent;

      if (root) {
        root.style.height = previous.rootHeight;
        root.style.minHeight = previous.rootMinHeight;
        root.style.width = previous.rootWidth;
      }
    };
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(apiUrl(`/api/clinic-feedback?clinic_id=${clinicId}`), {
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as ClinicFeedbackResponse;

      if (!res.ok) {
        throw new Error(data.message || "Failed to load patient reviews.");
      }

      const normalized = Array.isArray(data.reviews) ? data.reviews : [];
      setReviews(normalized);
      setRatingCount(Number(data.rating_count || 0));
      setAverageRating(
        data.average_rating === null || data.average_rating === undefined
          ? null
          : Number(data.average_rating)
      );
      setReplyDrafts(
        normalized.reduce<Record<number, string>>((drafts, review) => {
          drafts[review.id] = review.clinic_reply || "";
          return drafts;
        }, {})
      );
    } catch (err) {
      console.error("Clinic reviews fetch error:", err);
      setReviews([]);
      setRatingCount(0);
      setAverageRating(null);
      setError(
        err instanceof Error ? err.message : "Failed to load patient reviews."
      );
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = reviews.filter((review) => {
    const hasReply = Boolean(String(review.clinic_reply || "").trim());
    const query = searchTerm.trim().toLowerCase();
    const matchesFilter =
      filter === "all" ||
      (filter === "needs-reply" && !hasReply) ||
      (filter === "replied" && hasReply);

    return (
      matchesFilter &&
      matchesSearch(
        query,
        review.reviewer_name,
        review.feedback,
        review.clinic_reply,
        review.rating,
        review.appointment_id,
        review.created_at
      )
    );
  });

  const saveReviewReply = async (reviewId: number) => {
    const reply = String(replyDrafts[reviewId] || "").trim();

    if (reply.length > 1000) {
      setError("Reply must be 1,000 characters or fewer.");
      return;
    }

    try {
      setSavingReplyId(reviewId);
      setError("");
      setMessage("");

      const res = await fetch(apiUrl(`/api/clinic-feedback/${reviewId}/reply`), {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          clinic_id: clinicId,
          reply,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        review?: ClinicReview;
      };

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save clinic reply.");
      }

      const updatedReview = data.review;

      if (updatedReview?.id) {
        setReviews((current) =>
          current.map((review) =>
            review.id === updatedReview.id ? { ...review, ...updatedReview } : review
          )
        );
        setReplyDrafts((current) => ({
          ...current,
          [updatedReview.id]: updatedReview.clinic_reply || "",
        }));
      } else {
        await fetchReviews();
      }

      setMessage(reply ? "Reply saved." : "Reply removed.");
    } catch (err) {
      console.error("Save review reply error:", err);
      setError(err instanceof Error ? err.message : "Failed to save clinic reply.");
    } finally {
      setSavingReplyId(null);
    }
  };

  const renderStars = (ratingValue: number | string) => {
    const rating = normalizeRating(ratingValue);

    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      const filled = rating >= starNumber;
      const half = !filled && rating >= starNumber - 0.5;

      if (half) {
        return <StarHalf key={starNumber} size={16} fill="currentColor" />;
      }

      return (
        <Star
          key={starNumber}
          size={16}
          fill={filled ? "currentColor" : "none"}
        />
      );
    });
  };

  return (
    <div
      className={`clinic-reviews-page ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
      <SidebarClinic
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search patient reviews..."
      />

      <main className="clinic-reviews-main">
        <section className="clinic-reviews-hero">
          <div>
            <span className="clinic-reviews-eyebrow">
              <MessageSquareText size={16} />
              Patient feedback
            </span>
            <h1>Patient Reviews</h1>
            <p>Read patient feedback and respond from one dedicated review page.</p>
          </div>

          <button
            type="button"
            className="clinic-reviews-refresh"
            onClick={() => void fetchReviews()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {(message || error) && (
          <div className={`clinic-reviews-alert ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        <section className="clinic-reviews-stats">
          <div className="clinic-reviews-stat">
            <span>Average Rating</span>
            <strong>
              {averageRating ? `${averageRating.toFixed(1)} / 5` : "No rating"}
            </strong>
          </div>
          <div className="clinic-reviews-stat">
            <span>Total Reviews</span>
            <strong>{ratingCount}</strong>
          </div>
          <div className="clinic-reviews-stat">
            <span>Needs Reply</span>
            <strong>{needsReplyCount}</strong>
          </div>
          <div className="clinic-reviews-stat">
            <span>Replied</span>
            <strong>{repliedCount}</strong>
          </div>
        </section>

        <section className="clinic-reviews-panel">
          <div className="clinic-reviews-toolbar">
            <div>
              <h2>Review Inbox</h2>
              <p>
                {loading
                  ? "Loading reviews..."
                  : `${filteredReviews.length} of ${reviews.length} reviews shown`}
              </p>
            </div>

            <div className="clinic-reviews-tabs" aria-label="Review filters">
              {(["all", "needs-reply", "replied"] as ReviewFilter[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    className={filter === item ? "active" : ""}
                    onClick={() => setFilter(item)}
                  >
                    {item === "all"
                      ? "All"
                      : item === "needs-reply"
                      ? "Needs reply"
                      : "Replied"}
                  </button>
                )
              )}
            </div>
          </div>

          {loading ? (
            <div className="clinic-reviews-empty">Loading patient reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="clinic-reviews-empty">
              <MessageSquareText size={30} />
              <strong>No reviews found.</strong>
              <span>
                Completed appointments can leave a rating, then they will appear
                here for the clinic to review.
              </span>
              <Link to="/clinic/appointments">Open appointments</Link>
            </div>
          ) : (
            <div className="clinic-reviews-list">
              {filteredReviews.map((review) => {
                const draft = replyDrafts[review.id] ?? "";
                const savedReply = review.clinic_reply || "";
                const hasChanges = draft.trim() !== savedReply.trim();
                const isSaving = savingReplyId === review.id;
                const rating = normalizeRating(review.rating);

                return (
                  <article className="clinic-review-item" key={review.id}>
                    <div className="clinic-review-item-head">
                      <div>
                        <strong>{review.reviewer_name || "Cuidado user"}</strong>
                        <span>
                          Appointment #{review.appointment_id || "-"} •{" "}
                          {fmtDateTime(review.created_at)}
                        </span>
                      </div>
                      <div className="clinic-review-rating">
                        <span>{rating.toFixed(0)} / 5</span>
                        <div aria-label={`${rating.toFixed(0)} out of 5 stars`}>
                          {renderStars(rating)}
                        </div>
                      </div>
                    </div>

                    <p className="clinic-review-feedback">
                      {review.feedback || "No written feedback."}
                    </p>

                    {savedReply && (
                      <div className="clinic-review-current-reply">
                        <div>
                          <Reply size={15} />
                          <strong>Clinic reply</strong>
                        </div>
                        <p>{savedReply}</p>
                        <span>{fmtDateTime(review.clinic_reply_updated_at)}</span>
                      </div>
                    )}

                    <label className="clinic-review-reply-field">
                      <span>{savedReply ? "Update reply" : "Write a reply"}</span>
                      <textarea
                        value={draft}
                        maxLength={1000}
                        placeholder="Thank the patient or clarify next steps..."
                        onChange={(event) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [review.id]: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <div className="clinic-review-actions">
                      <span>{draft.trim().length} / 1000</span>
                      <button
                        type="button"
                        disabled={
                          isSaving || !hasChanges || draft.trim().length > 1000
                        }
                        onClick={() => saveReviewReply(review.id)}
                      >
                        {isSaving
                          ? "Saving..."
                          : savedReply
                          ? "Update Reply"
                          : "Save Reply"}
                      </button>
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
