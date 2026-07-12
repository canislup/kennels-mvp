import { prisma } from "@/lib/db";
import {NextRequest, NextResponse} from "next/server";

export const GET = async (request: NextRequest) => {
    console.log("*******************************");
    console.log("🚀 Starting Request Method Now!");
    console.log("*******************************");


    try {
        // 1) Parsing the search params
        const searchParams = request.nextUrl.searchParams;
        console.log("Search Params: ", searchParams);

        // 2) Parsing the BREED out of the search params
        const breed = searchParams.get("breed")?.replaceAll("-", " ");
        const city = searchParams.get("city")?.replaceAll("-", " ");

        // 3) Querying the searched breed in database
        const searchResults = await prisma.dog.findMany({
            where: {
                // Filter 1: The Dog's Breed
                ...(breed && {
                    breed: {
                        equals: breed,
                        mode: 'insensitive' // Ignores capitalization
                    }
                }),

                // Filter 2: The Parent Kennel's City
                ...(city && {
                    kennel: {
                        city: {
                            equals: city,
                            mode: 'insensitive' // Crucial: users will type "sao paulo" without accents/caps
                        }
                    }
                })
            },

            // 4) ALWAYS include the kennel data
            include: {
                kennel: {
                    select: { name: true, city: true, state: true }
                }
            }
        });

        // 4) Returning the result of the breed
        return NextResponse.json(searchResults, {
            status: 200,
        })



    } catch (error) {
        // 5) Handle errors
        console.error("❌ Database Search Error: ", error);

        return NextResponse.json(
            {error: "An error occurred while searching for your request"} ,
            {status: 500}
        )
    }

}