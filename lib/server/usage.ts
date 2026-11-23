import { NextResponse } from "next/server";
import { createClient } from "../supabase/server";

type QuotaAction = "discover" | "contacts" | "reveal";

const LIMITS: Record<QuotaAction, number> = {
  discover: 8,
  contacts: 20,
  reveal: 10,
};

export async function enforceApiQuota(action: QuotaAction): Promise<NextResponse | null> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("consume_api_quota", {
    p_action: action,
    p_limit: LIMITS[action],
    p_window_seconds: 900,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: "Usage limits are not available yet. Apply the latest Supabase database migration, then try again." },
      { status: 503 }
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.allowed !== "boolean") {
    return NextResponse.json({ error: "Could not verify the usage limit. Please try again." }, { status: 503 });
  }

  if (!result.allowed) {
    const retryAfter = Math.max(1, Number(result.retry_after_seconds) || 900);
    return NextResponse.json(
      { error: "You have reached the usage limit for this action. Please wait before trying again.", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return null;
}
