import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !service) {
  console.error("Missing env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, service, { auth: { persistSession: false } });

async function ensureUser(email: string, password: string, name: string, role: "Admin" | "User") {
  const { data: existing } = await sb.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  let id: string;
  if (!found) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error;
    id = data.user.id;
  } else {
    id = found.id;
  }
  await sb.from("users").upsert({ id, email, name, role });
  return id;
}

async function main() {
  console.log("Seeding…");
  const adminId = await ensureUser("admin@demo.local", "password123!", "Admin Demo", "Admin");
  const est1 = await ensureUser("estimator1@demo.local", "password123!", "Estimator One", "User");
  const est2 = await ensureUser("estimator2@demo.local", "password123!", "Estimator Two", "User");

  const companies = [
    { name: "JHS Roofing", type: "Roofing Company" },
    { name: "Hayes Roofing", type: "Roofing Company" },
    { name: "Nations Best Roofing", type: "Roofing Company" },
    { name: "State Farm", type: "Carrier" },
    { name: "Allstate", type: "Carrier" },
    { name: "Nationwide", type: "Carrier" },
  ];
  const { data: compData, error: compErr } = await sb.from("companies").insert(companies).select("*");
  if (compErr) throw compErr;

  const getComp = (name: string) => compData!.find((c) => c.name === name)!.id;

  const statusSeed = [
    // internal primary
    ["internal_primary", "New File Request"],
    ["internal_primary", "Building in Xactimate"],
    ["internal_primary", "Xactimate Built"],
    ["internal_primary", "Ready to Supplement"],
    ["internal_primary", "Supplement Sent"],
    ["internal_primary", "Supplement Approved"],
    ["internal_primary", "Ready to Send Completion Documents"],
    ["internal_primary", "Completion Sent"],
    ["internal_primary", "Past / Closed"],
    // internal sub
    ["internal_sub", "Needs More Info From Roofer"],
    ["internal_sub", "Adjuster Reviewing"],
    ["internal_sub", "Adjuster Needs Supporting Documents"],
    ["internal_sub", "Needs Estimator Attention"],
    ["internal_sub", "Needs Estimator Attention ASAP"],
    ["internal_sub", "Supplement Denied"],
    ["internal_sub", "Reinspection"],
    ["internal_sub", "Reinspection Scheduled"],
    // customer status
    ["customer_status", "Received"],
    ["customer_status", "In Review"],
    ["customer_status", "Being Built"],
    ["customer_status", "Awaiting Info"],
    ["customer_status", "Submitted"],
    ["customer_status", "In Negotiation"],
    ["customer_status", "Approved"],
    ["customer_status", "Closed"],
  ].map(([kind, name], i) => ({ kind, name, sort_order: i }));

  const { data: statusData, error: stErr } = await sb.from("status_options").insert(statusSeed).select("*");
  if (stErr) throw stErr;

  const st = (kind: string, name: string) => statusData!.find((s) => s.kind === kind && s.name === name)!.id;

  const tagSeed = [
    "ITEL","Engineer","Matching","Code Upgrade","RPS","ACV Holdback","O&P Dispute","Tax Issue","Photos Needed","Carrier Non-Responsive","Escalation Pending"
  ].map((name, i) => ({ name, sort_order: i }));

  const { data: tagData, error: tgErr } = await sb.from("tag_options").insert(tagSeed).select("*");
  if (tgErr) throw tgErr;

  const catSeed = ["Estimate", "Photos", "Carrier Docs", "ITEL", "Engineer Report", "Invoices", "Other"].map((name, i) => ({ name, sort_order: i }));
  const { error: catErr } = await sb.from("document_categories").insert(catSeed);
  if (catErr) throw catErr;

  const jobs = [
    {
      insured_name: "John Doe",
      property_address: "123 Main St, Oklahoma City, OK",
      claim_number: "SF-10001",
      carrier_company_id: getComp("State Farm"),
      roofing_company_id: getComp("JHS Roofing"),
      assigned_estimator_id: est1,
      internal_primary_status_id: st("internal_primary","New File Request"),
      internal_sub_status_id: st("internal_sub","Needs More Info From Roofer"),
      customer_status_id: st("customer_status","Received"),
      initial_rcv: 12000, requested_rcv: 18500, final_approved_rcv: 0
    },
    {
      insured_name: "Jane Smith",
      property_address: "44 Oak Ave, Edmond, OK",
      claim_number: "AL-20002",
      carrier_company_id: getComp("Allstate"),
      roofing_company_id: getComp("Hayes Roofing"),
      assigned_estimator_id: est2,
      internal_primary_status_id: st("internal_primary","Ready to Supplement"),
      internal_sub_status_id: st("internal_sub","Needs Estimator Attention"),
      customer_status_id: st("customer_status","Being Built"),
      initial_rcv: 9800, requested_rcv: 14000, final_approved_rcv: 0
    },
    {
      insured_name: "Carlos Ramirez",
      property_address: "9 Pine Dr, Moore, OK",
      claim_number: "NW-30003",
      carrier_company_id: getComp("Nationwide"),
      roofing_company_id: getComp("Nations Best Roofing"),
      assigned_estimator_id: est1,
      internal_primary_status_id: st("internal_primary","Supplement Sent"),
      internal_sub_status_id: st("internal_sub","Adjuster Reviewing"),
      customer_status_id: st("customer_status","In Negotiation"),
      date_supplement_sent: new Date().toISOString().slice(0,10),
      initial_rcv: 15000, requested_rcv: 21000, final_approved_rcv: 16500
    },
    {
      insured_name: "Tina Brown",
      property_address: "777 Sunset Blvd, Yukon, OK",
      claim_number: "SF-10004",
      carrier_company_id: getComp("State Farm"),
      roofing_company_id: getComp("JHS Roofing"),
      assigned_estimator_id: est2,
      internal_primary_status_id: st("internal_primary","Xactimate Built"),
      customer_status_id: st("customer_status","Being Built"),
      initial_rcv: 8000, requested_rcv: 11000, final_approved_rcv: 0
    },
    {
      insured_name: "Mark Lee",
      property_address: "61 River Rd, Tulsa, OK",
      claim_number: "AL-20005",
      carrier_company_id: getComp("Allstate"),
      roofing_company_id: getComp("Hayes Roofing"),
      assigned_estimator_id: est1,
      internal_primary_status_id: st("internal_primary","Supplement Approved"),
      customer_status_id: st("customer_status","Approved"),
      initial_rcv: 10000, requested_rcv: 16000, final_approved_rcv: 15500
    },
    {
      insured_name: "Olivia Davis",
      property_address: "500 Ridge Ln, Norman, OK",
      claim_number: "NW-30006",
      carrier_company_id: getComp("Nationwide"),
      roofing_company_id: getComp("Nations Best Roofing"),
      assigned_estimator_id: est2,
      internal_primary_status_id: st("internal_primary","Past / Closed"),
      customer_status_id: st("customer_status","Closed"),
      initial_rcv: 13250, requested_rcv: 13250, final_approved_rcv: 13250
    },
    {
      insured_name: "Sam Carter",
      property_address: "88 Elm St, Bethany, OK",
      claim_number: "SF-10007",
      carrier_company_id: getComp("State Farm"),
      roofing_company_id: getComp("JHS Roofing"),
      assigned_estimator_id: est1,
      internal_primary_status_id: st("internal_primary","Building in Xactimate"),
      customer_status_id: st("customer_status","In Review"),
      initial_rcv: 0, requested_rcv: 0, final_approved_rcv: 0
    },
    {
      insured_name: "Emily Nguyen",
      property_address: "12 Lake View, Mustang, OK",
      claim_number: "AL-20008",
      carrier_company_id: getComp("Allstate"),
      roofing_company_id: getComp("Hayes Roofing"),
      assigned_estimator_id: est2,
      internal_primary_status_id: st("internal_primary","Ready to Send Completion Documents"),
      customer_status_id: st("customer_status","Approved"),
      initial_rcv: 14500, requested_rcv: 19500, final_approved_rcv: 19000
    },
  ];

  const { data: jobData, error: jobErr } = await sb.from("jobs").insert(jobs).select("*");
  if (jobErr) throw jobErr;

  // Add tags to some jobs
  const tag = (name: string) => tagData!.find((t) => t.name === name)!.id;
  await sb.from("job_tag_map").insert([
    { job_id: jobData![0].id, tag_id: tag("Photos Needed") },
    { job_id: jobData![1].id, tag_id: tag("Matching") },
    { job_id: jobData![2].id, tag_id: tag("Carrier Non-Responsive") },
    { job_id: jobData![2].id, tag_id: tag("O&P Dispute") },
  ]);

  // Sample comment with mention + notification
  const { data: c1, error: cErr } = await sb.from("comments").insert({
    job_id: jobData![2].id,
    author_id: adminId,
    body: "Following up with @Estimator One on supporting docs for the supplement.",
  }).select("*").single();
  if (cErr) throw cErr;

  await sb.from("comment_mentions").insert({ comment_id: c1!.id, mentioned_user_id: est1 });
  await sb.from("notifications").insert({ recipient_user_id: est1, job_id: jobData![2].id, comment_id: c1!.id, type: "mention" });

  await sb.from("activity").insert({
    job_id: jobData![2].id,
    actor_user_id: adminId,
    type: "COMMENT_CREATED",
    metadata: { commentId: c1!.id },
  });

  // Tasks
  await sb.from("tasks").insert([
    { job_id: jobData![2].id, title: "Call adjuster for status update", assignee_id: est1, due_date: new Date().toISOString().slice(0,10), priority: "High", status: "Open" },
    { job_id: jobData![1].id, title: "Finalize scope notes", assignee_id: est2, due_date: new Date(Date.now()+86400000).toISOString().slice(0,10), priority: "Medium", status: "In Progress" },
  ]);

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
