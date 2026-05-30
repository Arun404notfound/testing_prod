import { NextResponse } from "next/server";
import { getSession } from "./session";

/** Returns a 401 response if the caller is not an admin session, otherwise null. */
export async function unauthorizedIfNotAdmin(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
