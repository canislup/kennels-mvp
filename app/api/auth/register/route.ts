import { prisma } from "@/lib/db";
import { NextRequest, NextResponse} from "next/server";
import bcrypt from "bcrypt";


export const POST = async (request: NextRequest)=> {
    console.log("*******************************");
    console.log("🧔‍♂️ Starting Register Owner Method Now!");
    console.log("*******************************");

    // Application Start
    try{
        // 1) Parsing the information sent through the post request body
        const { fullName, email, phoneNumber, password } = await request.json();
        console.log("Request body: ", fullName, email, phoneNumber, password);

        // 2) Checking if the user already exists in database
        const doesUserExist = await prisma.owner.findUnique({
            where: {
                email: email,
            },

            select: {
                email: true,
                fullName: true,
                kennel: {
                    select: {name: true}
                }
            }
        })

        // If the user exists we return a response with the user
        if (doesUserExist) {
            return NextResponse.json({
                message: "User already exists",
                data: {
                    user: doesUserExist,
                }
            }, {status: 409})
        } else {

            // 3) Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);


            // 4) create the user in the database
            const createdUser = await prisma.owner.create({
                data: {
                    fullName: fullName,
                    email: email,
                    phoneNumber: phoneNumber,
                    passwordHash: hashedPassword
                }
            })

            // 5) Return the created user object
            return NextResponse.json({
                message: "User created successfully",
                data: {
                    createdUser: {
                        id: createdUser.id,
                        name: createdUser.fullName,
                        email: createdUser.email,
                        phoneNumber: createdUser.phoneNumber,
                        createdAt: createdUser.createdAt
                    },
                }
            }, {status: 201})

        }



    } catch (error) {
        console.error("❌ something went wrong", error)
        return NextResponse.json({message:"User could NOT be registered"}, {status: 500})
    }
}