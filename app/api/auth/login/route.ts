import { NextRequest, NextResponse } from "next/server";
import { cookies} from "next/headers";
import { prisma } from "@/lib/db";
import bcrypt  from "bcrypt";
import { SignJWT} from "jose";

export const POST = async (request: NextRequest) => {

    const authFailedMessage = "Invalid email or password";
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    console.log("secret", secret);

    // Start
    try {
        // 1) Parse the request body
        const {email, password} = await request.json();

        // 2) Search if there is an existing user in database
       const user = await prisma.owner.findUnique({
           where: { email },
           select: {
               id: true,
               email: true,
               fullName: true,
               passwordHash: true,
           }
       })

        // 3) if Null return user not found
        if(!user) {
            return NextResponse.json(
                {message: authFailedMessage},
                {status: 401}
            )
        }

        // 4) Compare if passwords are equal
        const isSamePassword = await bcrypt.compare(password, user.passwordHash);

        // 5) Return 'incorrect user or password' if passwords don't match
        if(!isSamePassword) {
            return NextResponse.json(
                {message: authFailedMessage},
                {status: 401}
            )
        } else {
            // 6) Create Session Token
            const token = await new SignJWT({ userID: user.id })
                .setProtectedHeader({ alg: "HS256"})
                .setIssuedAt()
                .setExpirationTime("7d")
                .sign(secret)

            console.log(token);

            // 7) Set the cookie in user browser
            const cookie = await cookies();
            cookie.set("kennel_session", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7,
            })

            // 8) Login in the user
            return NextResponse.json(
                {
                    message: "Successfully logged in!",
                    data: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email
                    }
                },
                {status: 200}
            );
        }
    } catch (error) {
        console.error("❌ Something went wrong",error);
        return NextResponse.json(
            {message: "Internal Server Error"},
            {status: 500}
        )
    }
}