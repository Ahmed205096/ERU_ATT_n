import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secretKey = "session";
const key = new TextEncoder().encode(process.env.SESSION_SECRET || secretKey);

export async function middleware(request: NextRequest) {
    const session = request.cookies.get("session")?.value;

    if (request.nextUrl.pathname.startsWith("/admin")) {
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        try {
            // Verify JWT
            await jwtVerify(session, key, {
                algorithms: ["HS256"],
            });
            return NextResponse.next();
        } catch (e) {
            // Invalid token
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
