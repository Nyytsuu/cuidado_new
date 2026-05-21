import { apiUrl, isNativeMobileRuntime } from "../sharedBackendFetch";

export async function login(
  email: string,
  password: string,
  captchaToken?: string
) {
  const loginPath = isNativeMobileRuntime() ? "/api/mobile/login" : "/api/login";

  const res = await fetch(apiUrl(loginPath), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      captchaToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Login failed");

  return data;
}
