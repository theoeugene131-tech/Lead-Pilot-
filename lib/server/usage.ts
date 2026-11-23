import { NextResponse } from "next/server";
import { createClient } from "../supabase/server";

const LIMITS: Record<string, number> = {
  discover: 8,
  contacts: 20,
  reveal: 10,
};

export async function enforceApiQuota(action: keyof typeof LIMITS): Promise<NextResponse | null> {
  try {
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

    // Fail closed: never allow paid provider calls if quota enforcement is unavailable.
    if (error) {
      return NextResponse.json(
        { error: "Usage protection is not ready. Apply the latest LeadPilot database migration, then try again." },
        { status: 503 }
      );
    }
    if (data !== true) {
      return NextResponse.json(
        { error: "You've reached the current usage limit for this action. Please wait 15 minutes before trying again." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }
    return null;
  } catch {
    return NextResponse.json({ error: "Could not verify your usage allowance. Please try again." }, { status: 503 });
  }
}
