import { Capacitor } from "@capacitor/core";
import type { PermissionState } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type AppLocationCoords = {
  lat: number;
  lng: number;
};

type LocationIssue =
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "unsupported"
  | "unknown";

export class AppLocationError extends Error {
  issue: LocationIssue;

  constructor(issue: LocationIssue, message: string) {
    super(message);
    this.name = "AppLocationError";
    this.issue = issue;
  }
}

const isGranted = (state?: PermissionState) => state === "granted";

const hasNativeLocationPermission = (status: {
  location?: PermissionState;
  coarseLocation?: PermissionState;
}) => isGranted(status.location) || isGranted(status.coarseLocation);

const toAppLocationError = (error: unknown) => {
  if (error instanceof AppLocationError) {
    return error;
  }

  if (
    typeof GeolocationPositionError !== "undefined" &&
    error instanceof GeolocationPositionError
  ) {
    if (error.code === error.PERMISSION_DENIED) {
      return new AppLocationError(
        "permission-denied",
        "Location permission is blocked. Open Android Settings and allow Location for Cuidado, then tap Locate Me again."
      );
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      return new AppLocationError(
        "position-unavailable",
        "Location is allowed, but the device could not find your position. Turn on device Location or set an emulator GPS point, then try again."
      );
    }

    if (error.code === error.TIMEOUT) {
      return new AppLocationError(
        "timeout",
        "Location took too long. Keep Location on and tap Locate Me again."
      );
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const normalized = message.toLowerCase();

  if (
    normalized.includes("permission") ||
    normalized.includes("denied") ||
    normalized.includes("not allowed")
  ) {
    return new AppLocationError(
      "permission-denied",
      "Location permission is blocked. Open Android Settings and allow Location for Cuidado, then tap Locate Me again."
    );
  }

  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return new AppLocationError(
      "timeout",
      "Location took too long. Keep Location on and tap Locate Me again."
    );
  }

  if (
    normalized.includes("unavailable") ||
    normalized.includes("disabled") ||
    normalized.includes("location services")
  ) {
    return new AppLocationError(
      "position-unavailable",
      "Location is allowed, but the device location service is unavailable. Turn on Location in the emulator/device, then try again."
    );
  }

  return new AppLocationError(
    "unknown",
    "Unable to access your location. Please type or share your address manually."
  );
};

const getWebLocation = () =>
  new Promise<AppLocationCoords>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new AppLocationError(
          "unsupported",
          "Your browser does not support location services."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(toAppLocationError(error)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  });

export const getCurrentAppLocation = async () => {
  if (!Capacitor.isNativePlatform()) {
    return getWebLocation();
  }

  try {
    let permission = await Geolocation.checkPermissions();

    if (!hasNativeLocationPermission(permission)) {
      permission = await Geolocation.requestPermissions({
        permissions: ["location", "coarseLocation"],
      });
    }

    if (!hasNativeLocationPermission(permission)) {
      throw new AppLocationError(
        "permission-denied",
        "Location permission is blocked. Open Android Settings and allow Location for Cuidado, then tap Locate Me again."
      );
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
      enableLocationFallback: true,
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch (error) {
    throw toAppLocationError(error);
  }
};

export const getLocationErrorMessage = (error: unknown) =>
  toAppLocationError(error).message;
