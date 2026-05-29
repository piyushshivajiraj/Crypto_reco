// =============================================================
//  Netlify Function: lead
//  Website Form  ->  Database (Supabase)  ->  Automated Workflow
//  Reachable at /api/lead (redirected in netlify.toml).
// =============================================================
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const company = String(body.company || "").trim();
    const needs = String(body.needs || "").trim();
    const honeypot = String(body.website || "").trim(); // bots fill this

    // ---- Spam trap: silently accept + drop ----
    if (honeypot) return json(200, { ok: true });

    // ---- Validation ----
    const errors = {};
    if (!name) errors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Please enter a valid work email.";
    if (name.length > 120) errors.name = "Name is too long.";
    if (needs.length > 4000) errors.needs = "Message is too long.";
    if (Object.keys(errors).length) {
      return json(422, { error: "Validation failed", errors });
    }

    // ---- 1) Store in the database / CRM ----
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const headers = event.headers || {};
    const ip = (headers["x-forwarded-for"] || "").split(",")[0].trim() || null;
    const userAgent = headers["user-agent"] || null;

    const { data: lead, error: dbError } = await supabase
      .from("leads")
      .insert({
        name,
        email,
        company: company || null,
        needs: needs || null,
        status: "new",
        source: "website",
        ip,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // ---- 2) Automated workflow ----
    await runWorkflow({ name, email, company, needs, id: lead.id });

    return json(200, { ok: true, id: lead.id });
  } catch (err) {
    console.error("[lead] error:", err);
    return json(500, { error: "Something went wrong on our end. Please try again." });
  }
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

// -------------------------------------------------------------
//  Automated workflow: notify sales, confirm to lead, ping Slack.
// -------------------------------------------------------------
async function runWorkflow({ name, email, company, needs, id }) {
  const tasks = [];

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.MAIL_FROM || "Crypto Reco <onboarding@resend.dev>";

    if (process.env.SALES_EMAIL) {
      tasks.push(
        resend.emails.send({
          from,
          to: process.env.SALES_EMAIL,
          reply_to: email,
          subject: `New demo request — ${company || name}`,
          html: salesEmailHtml({ name, email, company, needs, id }),
        })
      );
    }

    tasks.push(
      resend.emails.send({
        from,
        to: email,
        subject: "Thanks — we received your Crypto Reco demo request",
        html: confirmEmailHtml({ name }),
      })
    );
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    tasks.push(
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text:
            `:rocket: *New demo request*\n` +
            `*Name:* ${name}\n*Email:* ${email}\n` +
            (company ? `*Company:* ${company}\n` : "") +
            `*Needs:* ${needs || "—"}`,
        }),
      })
    );
  }

  await Promise.allSettled(tasks);
}

// -------------------------------------------------------------
//  Email templates
// -------------------------------------------------------------
function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

function salesEmailHtml({ name, email, company, needs, id }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e2436">
    <div style="background:linear-gradient(110deg,#1f4fe0,#8a2be0);padding:20px 24px;border-radius:12px 12px 0 0">
      <h2 style="margin:0;color:#fff;font-size:18px">New Demo Request</h2>
    </div>
    <div style="border:1px solid #ececf5;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <p style="margin:0 0 6px"><strong>Name:</strong> ${esc(name)}</p>
      <p style="margin:0 0 6px"><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
      ${company ? `<p style="margin:0 0 6px"><strong>Company:</strong> ${esc(company)}</p>` : ""}
      <p style="margin:12px 0 4px"><strong>Reconciliation needs:</strong></p>
      <p style="margin:0;padding:12px;background:#f6f7fb;border-radius:8px;white-space:pre-wrap">${esc(needs) || "—"}</p>
      <p style="margin:18px 0 0;font-size:12px;color:#8b91a3">Lead ID: ${esc(id)}</p>
    </div>
  </div>`;
}

function confirmEmailHtml({ name }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e2436">
    <div style="background:linear-gradient(110deg,#1f4fe0,#8a2be0);padding:24px;border-radius:12px 12px 0 0">
      <h2 style="margin:0;color:#fff;font-size:20px">Crypto Reco</h2>
    </div>
    <div style="border:1px solid #ececf5;border-top:0;border-radius:0 0 12px 12px;padding:28px">
      <p style="margin:0 0 14px">Hi ${esc(name) || "there"},</p>
      <p style="margin:0 0 14px">Thanks for requesting a demo of Crypto Reco. Our team has received your details and will reach out within one business day to schedule a personalized walkthrough.</p>
      <p style="margin:0 0 14px">In the meantime, if you have anything urgent, just reply to this email.</p>
      <p style="margin:22px 0 0">— The Crypto Reco Team</p>
    </div>
  </div>`;
}
