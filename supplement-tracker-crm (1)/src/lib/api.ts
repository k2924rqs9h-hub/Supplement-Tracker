import { z } from "zod";

export async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const JobSchema = z.object({
  id: z.string(),
  insured_name: z.string(),
  property_address: z.string(),
  claim_number: z.string().nullable(),
  carrier_company_id: z.string().nullable(),
  adjuster_name: z.string().nullable(),
  adjuster_email: z.string().nullable(),
  adjuster_phone: z.string().nullable(),
  roofing_company_id: z.string().nullable(),
  assigned_estimator_id: z.string().nullable(),
  internal_primary_status_id: z.string(),
  internal_sub_status_id: z.string().nullable(),
  customer_status_id: z.string().nullable(),
  adjuster_notes: z.string().nullable(),
  date_file_created: z.string(),
  date_xactimate_built: z.string().nullable(),
  date_supplement_sent: z.string().nullable(),
  last_updated: z.string(),
  initial_rcv: z.number().nullable(),
  requested_rcv: z.number().nullable(),
  final_approved_rcv: z.number().nullable(),
});
export type Job = z.infer<typeof JobSchema>;
