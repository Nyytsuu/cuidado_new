// src/components/handleSubmit.ts
export type SignupPayload = {
  fullname: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  province_id: string;
  municipality_id: string;
  barangay_id: string;
  address: string;
  password: string;
};

export async function handleSubmit(payload: SignupPayload) {
  const res = await fetch("http://localhost:5000/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // read body safely even if backend sends non-json
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    // IMPORTANT: this will show the backend's error
    throw new Error(data?.message || `Signup failed (HTTP ${res.status})`);
  }

  return data;
}