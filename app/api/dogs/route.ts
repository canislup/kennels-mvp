import { prisma } from "@/lib/db";
import { NextRequest, NextResponse} from "next/server";
import { verifyKennelSession } from "@/lib/auth";

// Creating a dog in the database
export const POST = async(request: NextRequest) => {
    try {
        console.log("*******************************");
        console.log("🦮️ Starting CREATE DOG Method Now!");
        console.log("*******************************");

        // 1) Verify User Session
        const payload = await verifyKennelSession();

        // 2) If no session is found return unauthorized
        if (!payload) {
            return NextResponse.json(
                { message: "Unauthorized. Please log in again." },
                { status: 401 }
            );
        }

        console.log("Payload: ",payload);

        // 3) Look up kennel in database
        const ownerId = payload.userID as string;
        const kennel = await prisma.kennel.findUnique({
            where: { ownerId: ownerId }
        });

        // CASE: kennel is null -> send response to create a kennel
        if(!kennel) {
            return NextResponse.json(
                {message: "Action not allowed. User must first create a kennel profile."},
                {status: 403}
            )
        }

        // 2) CASE: Kennel Exists -> Create Dog
        const body = await request.json()
        console.log("body: ", body);

        const createdDog = await prisma.dog.create({
            data: {
                ...body,
                kennelId: kennel.id
            }
        })

        // 3) Send Success response and return dog data
        return NextResponse.json(
            {message: "✅ Dog added successfully.", data: createdDog},
            {status: 201}
        )
    } catch (error) {
        console.error("❌ Something went terribly wrong: \n",error)
        return NextResponse.json(
            {message: "Internal Server Error"},
            {status: 500}
        )
    }
}

// Getting all dogs from a kennel
export const GET = async(request: NextRequest) => {
    try {
        // 1) Authenticate Session
        const payload = await verifyKennelSession();
        if (!payload) {
            return NextResponse.json(
                {message: "Unauthorized. Please log in again." },
                {status: 401}
            )
        }

        // 2) Extract user id from session
        const ownerId = payload.userID as string;

        // 3) Get Dogs from database
        const dogs = await prisma.kennel.findUnique({
            where: { ownerId: ownerId },
            include: {
                dogs: {
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            }
        })

        // 4) Return the dogs data
        return NextResponse.json(
            {message: "✅ Everything is ok!", data: dogs},
            {status: 200}
        )
    } catch (error) {
        console.error("❌ Something went terribly wrong: \n",error)
        return NextResponse.json(
            {message: "Internal Server Error"},
            {status: 500}
        )
    }
}