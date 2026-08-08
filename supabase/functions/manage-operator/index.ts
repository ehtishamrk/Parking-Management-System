// Supabase Edge Function: manage-operator
// Creates or deactivates operator logins. Runs on Supabase's servers, not
// on GitHub Pages — this is where the service-role key is allowed to live.
// Deploy with: supabase functions deploy manage-operator
// Set the secret once with: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
//
// @ts-nocheck  (Deno runtime — types resolved at deploy time, not by Next's tsc)
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: cors });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the caller is a signed-in admin, using their own token (anon key + their JWT).
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: cors });

  const { data: callerProfile } = await callerClient.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: cors });
  }

  const admin = createClient(url, serviceKey);
  const body = await req.json();

  if (body.action === "create") {
    const { email, password, full_name, phone } = body;
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !created.user) {
      return new Response(JSON.stringify({ error: error?.message ?? "Failed to create user" }), { status: 400, headers: cors });
    }
    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id, full_name, phone, role: "operator",
    });
    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: cors });
    }
    return new Response(JSON.stringify({ ok: true, id: created.user.id }), { headers: cors });
  }

  if (body.action === "set_active") {
    const { id, is_active } = body;
    const { error } = await admin.from("profiles").update({ is_active }).eq("id", id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: cors });
});
