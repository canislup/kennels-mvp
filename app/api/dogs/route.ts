import { prisma } from "@/lib/db";
import { NextRequest, NextResponse} from "next/server";
import { verifyKennelSession } from "@/lib/auth";
import { nextAvailableSlug, slugify } from "@/lib/slug";
import { lifeStageFromStatus } from "@/lib/dog-life-stage";

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

        // Slug is server-generated (unique per kennel) and never taken from the
        // client. Retry on the rare race where two same-named dogs are created
        // at once and both pick the same slug.
        let createdDog;
        for (let attempt = 0; ; attempt++) {
            const existing = await prisma.dog.findMany({
                where: { kennelId: kennel.id },
                select: { slug: true },
            });
            const taken = new Set(existing.map((d) => d.slug));
            const slug = nextAvailableSlug(slugify(String(body.name ?? "")), taken);
            try {
                createdDog = await prisma.dog.create({
                    data: {
                        // Older clients don't send lifeStage; infer it from the sales status.
                        lifeStage: lifeStageFromStatus(body.status),
                        ...body,
                        slug,
                        kennelId: kennel.id
                    }
                })
                break;
            } catch (error) {
                const isSlugConflict = (error as { code?: string }).code === "P2002";
                if (!isSlugConflict || attempt >= 2) throw error;
            }
        }

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