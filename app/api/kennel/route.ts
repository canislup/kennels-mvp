import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/lib/db";
import { verifyKennelSession } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const PATCH = async (request: NextRequest) => {
    try {
        console.log("*******************************");
        console.log("🧔‍♂️ Starting Kennel PATCH Method Now!");
        console.log("*******************************");

        // 1) Verify session
        const payload = await verifyKennelSession();
        if (!payload) {
            return NextResponse.json(
                { message: "Unauthorized. Please log in again." },
                { status: 401 }
            );
        }

        const ownerId = payload.userID as string;
        const body = await request.json();

        // 2) Check if a kennel already exists for this owner
        const existingKennel = await prisma.kennel.findUnique({
            where: { ownerId },
        });

        let savedKennel;

        if (!existingKennel) {
            // SCENARIO A: Onboarding — the kennel doesn't exist yet.
            const { name, slug, city, state, description, breeds } = body;

            if (!name || !slug || !city || !state) {
                return NextResponse.json(
                    { message: "Name, slug, city, and state are required to create a kennel." },
                    { status: 400 }
                );
            }

            savedKennel = await prisma.kennel.create({
                data: {
                    name,
                    slug: slugify(slug),
                    city,
                    state,
                    location: `${city}, ${state}`,
                    description: description || null,
                    primaryBreeds: Array.isArray(breeds) ? breeds : [],
                    ownerId,
                },
            });
        } else {
            // SCENARIO B: The kennel already exists — apply a partial update.
            const { name, slug, city, state, description, breeds } = body;
            const nextCity = city ?? existingKennel.city;
            const nextState = state ?? existingKennel.state;

            savedKennel = await prisma.kennel.update({
                where: { ownerId },
                data: {
                    ...(name !== undefined && { name }),
                    ...(slug !== undefined && { slug: slugify(slug) }),
                    ...(city !== undefined && { city }),
                    ...(state !== undefined && { state }),
                    ...((city !== undefined || state !== undefined) && {
                        location: `${nextCity}, ${nextState}`,
                    }),
                    ...(description !== undefined && { description }),
                    ...(Array.isArray(breeds) && { primaryBreeds: breeds }),
                },
            });
        }

        // 3) Return the freshly saved Kennel
        return NextResponse.json(
            { message: "Kennel Profile Saved!", data: savedKennel },
            { status: 200 }
        );
    } catch (error) {
        // A unique constraint failure most likely means the slug is already taken.
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            // With the pg driver adapter the violated fields live under
            // driverAdapterError.cause.constraint.fields instead of meta.target.
            const meta = error.meta as
                | {
                      target?: string[];
                      driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
                  }
                | undefined;
            const fields = meta?.target ?? meta?.driverAdapterError?.cause?.constraint?.fields;
            return NextResponse.json(
                {
                    message: fields?.includes("slug")
                        ? "That kennel URL is already taken — please choose another slug."
                        : "A kennel with those details already exists.",
                },
                { status: 409 }
            );
        }

        console.error("❌ Something went wrong", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
};
