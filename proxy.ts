import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never gate internal API routes with dashboard auth redirects.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const dashboard = profile?.role === "gerenta" ? "/gerenta" : "/asesor";
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  if (pathname.startsWith("/gerenta")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();
    if (profile?.role !== "gerenta") {
      return NextResponse.redirect(new URL("/asesor", request.url));
    }
  }

  if (pathname.startsWith("/asesor")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();
    if (profile?.role !== "asesor") {
      return NextResponse.redirect(new URL("/gerenta", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
