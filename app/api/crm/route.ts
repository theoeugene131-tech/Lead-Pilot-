import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

async function getWorkspaceId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.workspace_id) throw new Error("No workspace is linked to this account. Contact support.");
  return data.workspace_id as string;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const workspaceId = await getWorkspaceId(supabase, user.id);
    const { data, error } = await supabase
      .from("crm_snapshots")
      .select("payload, updated_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ snapshot: data?.payload ?? null, updatedAt: data?.updated_at ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load your cloud CRM.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = await request.json();
    const snapshot = body?.snapshot;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return NextResponse.json({ error: "A valid CRM snapshot is required." }, { status: 400 });
    }

    const serialized = JSON.stringify(snapshot);
    if (serialized.length > 2_000_000) {
      return NextResponse.json({ error: "Your CRM data is too large to sync in one request. Export a CSV backup and reduce the saved data." }, { status: 413 });
    }

    const workspaceId = await getWorkspaceId(supabase, user.id);
    const { error } = await supabase
      .from("crm_snapshots")
      .upsert({ workspace_id: workspaceId, payload: snapshot, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save your cloud CRM.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
