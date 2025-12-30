export type Role = "Admin" | "User";

export type Company = {
  id: string;
  name: string;
  type: "Roofing Company" | "Carrier" | "Other";
};

export type StatusOption = {
  id: string;
  kind: "internal_primary" | "internal_sub" | "customer_status";
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type TagOption = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type Job = {
  id: string;
  insured_name: string;
  property_address: string;
  claim_number: string | null;
  carrier_company_id: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  roofing_company_id: string | null;
  assigned_estimator_id: string | null;
  internal_primary_status_id: string;
  internal_sub_status_id: string | null;
  customer_status_id: string | null;
  adjuster_notes: string | null;
  date_file_created: string;
  date_xactimate_built: string | null;
  date_supplement_sent: string | null;
  last_updated: string;
  initial_rcv: number | null;
  requested_rcv: number | null;
  final_approved_rcv: number | null;
};
