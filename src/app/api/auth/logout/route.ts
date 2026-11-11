import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/env";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  session.destroy();
  // 303 so the browser follows the redirect with GET after the form POST.
  return NextResponse.redirect(`${requestOrigin(request)}/`, 303);
}
