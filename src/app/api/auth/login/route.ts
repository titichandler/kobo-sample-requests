import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  getAuthSecret,
  getReviewerPassword,
  verifyReviewerPassword,
} from "@/lib/session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";

    if (!verifyReviewerPassword(password, getReviewerPassword())) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const token = await createSessionToken(getAuthSecret());
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
