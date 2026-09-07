import { createClient } from "@supabase/supabase-js";

export function createViewsHandler(clientFactory = createClient) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (!["GET", "POST"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ message: "Method not allowed" });
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(503).json({ message: "View count unavailable." });
    }
    try {
      const client = clientFactory(url, key);
      const { data, error } = req.method === "POST"
        ? await client.rpc("increment_page_views")
        : await client.from("page_views").select("views").eq("page", "home").single();
      if (error) throw error;
      const count = Number(req.method === "POST" ? data : data?.views);
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid count");
      return res.status(200).json({ count });
    } catch {
      return res.status(503).json({ message: "View count unavailable." });
    }
  };
}

export default createViewsHandler();
