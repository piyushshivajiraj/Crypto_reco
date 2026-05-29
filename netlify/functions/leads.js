// =============================================================
//  Netlify Function: leads   (admin)
//  GET   -> list all leads (newest first)
//  PATCH -> update a lead's pipeline status
//  Reachable at /api/leads (redirected in netlify.toml).
//  Protected by a shared secret: header  x-admin-token: <ADMIN_TOKEN>
// =============================================================
import { createClient } from "@supabase/supabase-js";

const STATUSES = ["new", "contacted", "qualified", "won", "lost"];

export const handler = async (event) => {
  const headers = event.headers || {};
  const params = event.queryStringParameters || {};
  const token = headers["x-admin-token"] || params.token || "";

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return json(401, { error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ---- List ----
  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return json(500, { error: error.message });
    return json(200, { leads: data });
  }

  // ---- Update status ----
  if (event.httpMethod === "PATCH") {
    const body = JSON.parse(event.body || "{}");
    const { id, status } = body;
    if (!id || !STATUSES.includes(status)) {
      return json(422, { error: "Provide a valid id and status." });
    }
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed" });
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}
