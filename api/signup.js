import { createClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(200).json({
        message: "Signup received. Connect Supabase env vars to persist emails."
      });
    }

    const supabase = createClient(url, key);
    const { error } = await supabase
      .from("waitlist")
      .upsert({ email }, { onConflict: "email" });

    if (error) {
      return res.status(500).json({ message: "Could not save email." });
    }

    return res.status(200).json({ message: "You are on the waitlist." });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
}
