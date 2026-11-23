import { NextResponse } from "next/server";
// Deprecated shared-password login. Supabase Auth is used by the login screen.
export async function POST(){return NextResponse.json({error:"Legacy password login disabled. Use Supabase email/password."},{status:410});}
