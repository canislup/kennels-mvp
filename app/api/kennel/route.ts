import { cookies } from "next/headers";
import {NextRequest, NextResponse} from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";

export const PATCH = async (request: NextRequest) => {

    try {
        console.log("*******************************");
        console.log("🧔‍♂️ Starting Kennel PATCH Method Now!");
        console.log("*******************************");

        // 1) Extracting Cookie Session Information
        const cookieStore = await cookies();
        const cookieSession = cookieStore.get("kennel_session");

        // 2) Check if there is a cookies session
        if(!cookieSession) {
            console.log("Cookie session not found");

            return NextResponse.json(
                {message: "Cookie not found."},
                {status: 401}
            )
        }

        // 3) Generate Master key to evaluate session with
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        console.log("Secret: ", secret);

        let payload;
        try {
            // 4) Verify if tokens match and return payload
            const verifiedToken = await jwtVerify(cookieSession.value, secret);
            payload = verifiedToken.payload;

            console.log("✅ Token verified successfully.", payload);
        } catch (err) {
            console.error("❌ Token verification failed (Expired or Invalid)", err);
            return NextResponse.json(
                {message: "Invalid or Expired Token"},
                {status: 401}
            )
        }

        // 4) Extract the owner id and relevant date from body object
        const ownerId = payload.userID as string;
        const body = await request.json()

        // 5) Search if kennel exists in the database
        const existingKennel = await prisma.kennel.findUnique({
            where: { ownerId: ownerId }
        });

        let savedKennel;

        if (!existingKennel) {
            // SCENARIO A: The kennel doesn't exist yet.
            if (!body.name || !body.cnpj || !body.city || !body.state || !body.cbkcRegistration) {
                return NextResponse.json(
                    { message: "Missing required fields to create a new kennel." },
                    { status: 400 } // 400 Bad Request
                );
            }
            // Create the new kennel
            savedKennel = await prisma.kennel.create({
                data: {
                    ...body,
                    ownerId: ownerId,
                }
            });

        } else {
            // SCENARIO B: The kennel already exists
            savedKennel = await prisma.kennel.update({
                where: { ownerId: ownerId },
                data: body
            });
        }

        // 6) Return the freshly saved Kennel
        return NextResponse.json(
            { message: "Kennel Profile Saved!", data: savedKennel },
            { status: 200 }
        );




        // console.log("Session: ", cookieSession);

    } catch (error) {
        console.error("❌ Something went wrong",error);
        return NextResponse.json(
            {error: error},
            {status: 500}
        )
    }
}