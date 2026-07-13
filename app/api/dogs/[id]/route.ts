import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyKennelSession } from "@/lib/auth";

export const GET = async (request: NextRequest, { params }: { params: Promise<{id: string}> }) => {

    try {
        // 1) Await the params
        const resolvedParams = await params;
        const dogId = resolvedParams.id;

        console.log("Unwrapped Dog ID: ", dogId);

        // 2) Authenticate Session
        const payload = await verifyKennelSession();
        if (!payload) {
            return NextResponse.json(
                {message: "Unauthorized."},
                {status: 401}
            )
        }

        // 3) Extract the id of the owner account
        const ownerId = payload.userID as string;

        // 4) Query database for dog id sent in params
        const dog = await prisma.dog.findUnique({
            where: {
                id: dogId,
            },
            include: {
                kennel: true,
            }
        })

        // 5) Validate if dog queried belongs to owner or if there was a dog
        if(!dog || dog.kennel?.ownerId !== ownerId) {
            return NextResponse.json(
                {message: "Dog not found."},
                {status: 404}
            )
        }

        // 6) Extract Kennel info to clean up dog data before sending
        const { kennel, ...dogData } = dog;

        // 7) Return the dog data
        return NextResponse.json(
            {message: "Dog fetched successfully.", data: dogData},
            {status: 200}
        )

    } catch (error) {
        console.error("❌ Something went wrong: ", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export const PATCH = async (request: NextRequest, { params } : { params: Promise<{ id: string }>} ) => {
    try {
        // 1) Await the body info
        const body = await request.json();
        // const dogId = body.id;

        console.log("Body ", body);

        // 2) Await the params
        const resolvedParams = await params;
        const dogId = resolvedParams.id;

        console.log("Unwrapped Dog ID: ", dogId);

        // 3) Authenticate Session
        const payload = await verifyKennelSession();
        if (!payload) {
            return NextResponse.json(
                {message: "Unauthorized."},
                {status: 401}
            )
        }

        // 4) Extract the id of the owner account
        const ownerId = payload.userID as string;

        // 5) Retrieve dog data from database
        const dog = await prisma.dog.findUnique({
            where: {
                id: dogId,
            },
            include: {
                kennel: true,
            }
        })

        // 6) Verify if dog belongs to owner account
        if(!dog || dog.kennel?.ownerId !== ownerId) {
            return NextResponse.json(
                {message: "Dog not found."},
                {status: 404}
            )
        }

        // 7) Update the dog data
        const updatedDogData = await prisma.dog.update({
            where: {
                id: dogId
            },
            data: {
                ...body
            }
        })

        console.log("dog", dog);

        return NextResponse.json({message: "Dog updated successfully.", data: updatedDogData}, {status: 200})

    } catch (error) {
        console.error("❌ Something went wrong: ", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}