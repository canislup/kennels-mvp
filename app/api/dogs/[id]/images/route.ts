import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyKennelSession } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

// 1) Configure Cloudinary with your environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const POST = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        console.log("*******************************");
        console.log("📸 Starting Image Upload Method Now!");
        console.log("*******************************");

        // 2) Unwrap params and authenticate
        const resolvedParams = await params;
        const dogId = resolvedParams.id;

        const payload = await verifyKennelSession();
        if (!payload) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
        }

        const ownerId = payload.userID as string;

        // 3) Security Check: Verify Dog Ownership
        const dog = await prisma.dog.findUnique({
            where: { id: dogId },
            include: { kennel: true }
        });

        if (!dog || dog.kennel?.ownerId !== ownerId) {
            return NextResponse.json({ message: "Dog not found." }, { status: 404 });
        }

        // 4) Extract the file from the FormData
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        console.log("FormData", formData, "\nFile: ", file);

        if (!file) {
            return NextResponse.json({ message: "No file provided." }, { status: 400 });
        }

        // 🚨 Guard clause for file size (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes in bytes
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { message: "Image is too large. Please upload a file smaller than 10MB." },
                { status: 400 } // 400 Bad Request
            );
        }

        // 5) Convert the file into a Base64 string for Cloudinary
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString("base64");

        // Construct the Data URI (e.g., "data:image/jpeg;base64,.....")
        const fileUri = `data:${file.type};base64,${base64Data}`;

        // 6) Upload directly to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(fileUri, {
            folder: "kennel_dogs", // Keeps your Cloudinary dashboard organized!
        });

        console.log("✅ Cloudinary Upload Success: ", uploadResponse.secure_url);

        // 7) Save the secure URL to PostgreSQL
        // We use Prisma's 'push' command to add the new string to your photoUrls array
        const updatedDog = await prisma.dog.update({
            where: { id: dogId },
            data: {
                photoUrls: {
                    push: uploadResponse.secure_url
                }
            }
        });

        return NextResponse.json(
            {
                message: "Image uploaded successfully!",
                data: updatedDog
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("❌ Image upload failed: ", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
};