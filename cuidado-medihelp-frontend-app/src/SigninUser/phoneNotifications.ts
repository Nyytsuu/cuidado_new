import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";

type PhoneAppointment = {
  id: number;
  start_at?: string | null;
  proposed_start_at?: string | null;
  status?: string | null;
  purpose?: string | null;
  specialization?: string | null;
  clinic_name?: string | null;
  clinic_name_snapshot?: string | null;
  updated_at?: string | null;
  reschedule_requested_at?: string | null;
};

type PhoneNotificationItem = {
  id: number;
  title: string;
  message: string;
  category?: string | null;
  unread?: boolean;
  is_read?: number | boolean | null;
  created_at?: string | null;
  appointment_id?: number | null;
};

const CHANNEL_ID = "cuidado_appointments";
const GROUP_KEY = "cuidado.appointments";
const REMINDER_SIGNATURE_PREFIX = "cuidado-phone-reminder-signature";
const MIRRORED_NOTIFICATIONS_PREFIX = "cuidado-phone-mirrored-notifications";
const DAY_MS = 24 * 60 * 60 * 1000;

const isNativeNotificationsAvailable = () => Capacitor.isNativePlatform();

const parseLocalDateTime = (value?: string | number | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const match = value
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);

    if (match) {
      const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      );
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatAppointmentDate = (date: Date) =>
  date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatAppointmentTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const toNotificationId = (seed: string) => {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash % 2_000_000_000) + 1;
};

const getReminderSignatureKey = (userId: string | number) =>
  `${REMINDER_SIGNATURE_PREFIX}:${userId}`;

const getMirroredNotificationsKey = (userId: string | number) =>
  `${MIRRORED_NOTIFICATIONS_PREFIX}:${userId}`;

const getSeenNotificationIds = (userId: string | number) => {
  try {
    const raw = localStorage.getItem(getMirroredNotificationsKey(userId));
    const parsed = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(parsed.filter((id) => Number.isFinite(id)));
  } catch {
    return new Set<number>();
  }
};

const saveSeenNotificationIds = (userId: string | number, ids: Set<number>) => {
  const latest = [...ids].slice(-200);
  localStorage.setItem(getMirroredNotificationsKey(userId), JSON.stringify(latest));
};

const createAndroidChannel = async () => {
  if (Capacitor.getPlatform() !== "android") return;

  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Appointments",
      description: "Appointment reminders and Cuidado updates",
      importance: 4,
      visibility: 1,
      lights: true,
      lightColor: "#0f8f83",
      vibration: true,
    });
  } catch (error) {
    console.warn("Unable to create Cuidado notification channel:", error);
  }
};

export const ensurePhoneNotificationPermission = async () => {
  if (!isNativeNotificationsAvailable()) return false;

  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") {
    await createAndroidChannel();
    return true;
  }

  const requested = await LocalNotifications.requestPermissions();
  const granted = requested.display === "granted";

  if (granted) await createAndroidChannel();
  return granted;
};

const buildReminderSlots = (startAt: Date) => {
  const todayAtEight = new Date(startAt);
  todayAtEight.setHours(8, 0, 0, 0);
  const now = new Date();
  const isAppointmentToday =
    startAt.getFullYear() === now.getFullYear() &&
    startAt.getMonth() === now.getMonth() &&
    startAt.getDate() === now.getDate();
  const todayReminderAt =
    isAppointmentToday &&
    todayAtEight.getTime() <= now.getTime() &&
    startAt.getTime() > now.getTime() + 30_000
      ? new Date(now.getTime() + 20_000)
      : todayAtEight;

  return [
    {
      key: "week",
      title: "Appointment next week",
      at: new Date(startAt.getTime() - 7 * DAY_MS),
    },
    {
      key: "tomorrow",
      title: "Appointment tomorrow",
      at: new Date(startAt.getTime() - DAY_MS),
    },
    {
      key: "today",
      title: "Appointment today",
      at: todayReminderAt,
    },
    {
      key: "soon",
      title: "Appointment soon",
      at: new Date(startAt.getTime() - 60 * 60 * 1000),
    },
  ];
};

const appointmentScheduleValue = (appointment: PhoneAppointment) =>
  appointment.status === "reschedule_requested" && appointment.proposed_start_at
    ? appointment.proposed_start_at
    : appointment.start_at;

const buildReminderNotification = (
  userId: string | number,
  appointment: PhoneAppointment,
  slot: { key: string; title: string; at: Date },
  startAt: Date
): LocalNotificationSchema => {
  const clinicName =
    appointment.clinic_name_snapshot || appointment.clinic_name || "your clinic";
  const purpose = appointment.purpose || appointment.specialization || "appointment";
  const when = `${formatAppointmentDate(startAt)} at ${formatAppointmentTime(startAt)}`;

  return {
    id: toNotificationId(`reminder:${userId}:${appointment.id}:${slot.key}`),
    title: slot.title,
    body: `You have ${purpose} with ${clinicName} on ${when}.`,
    largeBody: `You have ${purpose} with ${clinicName} on ${when}. Tap to view your appointment details in Cuidado.`,
    summaryText: "Cuidado appointment reminder",
    schedule: { at: slot.at, allowWhileIdle: true },
    channelId: CHANNEL_ID,
    group: GROUP_KEY,
    autoCancel: true,
    extra: {
      app: "cuidado",
      type: "appointment-reminder",
      userId,
      appointmentId: appointment.id,
      route: "/appointments",
    },
  };
};

export const scheduleAppointmentPhoneReminders = async (
  userId: string | number | null | undefined,
  appointments: PhoneAppointment[]
) => {
  if (!userId || !isNativeNotificationsAvailable()) return;

  const eligibleAppointments = appointments
    .filter((appointment) =>
      ["pending", "confirmed", "reschedule_requested"].includes(
        String(appointment.status || "")
      )
    )
    .map((appointment) => ({
      appointment,
      startAt: parseLocalDateTime(appointmentScheduleValue(appointment)),
    }))
    .filter(
      (item): item is { appointment: PhoneAppointment; startAt: Date } =>
        Boolean(item.startAt) && item.startAt.getTime() > Date.now()
    );

  const signature = JSON.stringify(
    eligibleAppointments.map(({ appointment }) => [
      appointment.id,
      appointment.status,
      appointment.start_at,
      appointment.proposed_start_at,
      appointment.updated_at,
      appointment.reschedule_requested_at,
    ])
  );
  const signatureKey = getReminderSignatureKey(userId);

  if (localStorage.getItem(signatureKey) === signature) return;

  const granted = await ensurePhoneNotificationPermission();
  if (!granted) return;

  const pending = await LocalNotifications.getPending().catch(() => ({
    notifications: [],
  }));
  const existingReminderIds = pending.notifications
    .filter(
      (notification) =>
        notification.extra?.app === "cuidado" &&
        notification.extra?.type === "appointment-reminder" &&
        String(notification.extra?.userId) === String(userId)
    )
    .map((notification) => ({ id: notification.id }));

  if (existingReminderIds.length > 0) {
    await LocalNotifications.cancel({ notifications: existingReminderIds }).catch(
      (error) => console.warn("Unable to cancel old appointment reminders:", error)
    );
  }

  const now = Date.now();
  const notifications = eligibleAppointments.flatMap(({ appointment, startAt }) =>
    buildReminderSlots(startAt)
      .filter((slot) => {
        if (slot.at.getTime() <= now) return false;
        if (slot.at.getTime() >= startAt.getTime()) return false;
        return true;
      })
      .map((slot) => buildReminderNotification(userId, appointment, slot, startAt))
  );

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications }).catch((error) => {
      console.warn("Unable to schedule appointment phone reminders:", error);
    });
  }

  localStorage.setItem(signatureKey, signature);
};

export const showUnreadPhoneNotifications = async (
  userId: string | number | null | undefined,
  notifications: PhoneNotificationItem[]
) => {
  if (!userId || !isNativeNotificationsAvailable()) return;

  const unread = notifications.filter(
    (item) => item.unread ?? Number(item.is_read) === 0
  );
  if (unread.length === 0) return;

  const granted = await ensurePhoneNotificationPermission();
  if (!granted) return;

  const seenIds = getSeenNotificationIds(userId);
  const twoWeeksAgo = Date.now() - 14 * DAY_MS;

  const phoneNotifications = unread
    .filter((item) => !seenIds.has(Number(item.id)))
    .filter((item) => {
      const createdAt = parseLocalDateTime(item.created_at);
      return !createdAt || createdAt.getTime() >= twoWeeksAgo;
    })
    .slice(0, 3)
    .map((item) => ({
      id: toNotificationId(`feed:${userId}:${item.id}`),
      title: item.title || "Cuidado notification",
      body: item.message || "You have a new Cuidado update.",
      largeBody: item.message || "You have a new Cuidado update.",
      summaryText: "Cuidado notification",
      channelId: CHANNEL_ID,
      group: GROUP_KEY,
      autoCancel: true,
      extra: {
        app: "cuidado",
        type: "notification-feed",
        userId,
        notificationId: item.id,
        appointmentId: item.appointment_id || null,
        route: item.appointment_id ? "/appointments" : "/notifications",
      },
    }));

  if (phoneNotifications.length === 0) return;

  await LocalNotifications.schedule({ notifications: phoneNotifications }).catch(
    (error) => console.warn("Unable to show unread phone notifications:", error)
  );

  phoneNotifications.forEach((notification) => {
    const original = unread.find(
      (item) => toNotificationId(`feed:${userId}:${item.id}`) === notification.id
    );
    if (original) seenIds.add(Number(original.id));
  });
  saveSeenNotificationIds(userId, seenIds);
};

export const registerPhoneNotificationNavigation = (
  navigate: (route: string) => void
) => {
  if (!isNativeNotificationsAvailable()) return () => {};

  let listener: PluginListenerHandle | null = null;
  let disposed = false;

  LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const route = String(event.notification.extra?.route || "/notifications");
    navigate(route.startsWith("/") ? route : "/notifications");
  })
    .then((handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }
      listener = handle;
    })
    .catch((error) => {
      console.warn("Unable to register phone notification navigation:", error);
    });

  return () => {
    disposed = true;
    if (listener) void listener.remove();
  };
};
