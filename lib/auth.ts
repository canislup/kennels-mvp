import {cookies} from "next/headers";
import {jwtVerify} from "jose";

export const verifyKennelSession = async () => {
    // 1) Get and verify Session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("kennel_session")

    // CASE: token not found return null
    if(!token) {
        return null;
    }

    // GENERATE MASTER KEY
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // VERIFY IF TOKEN AND MASTER KEY MATCH
    try {
        const verifiedToken = await jwtVerify(token.value, secret);

        console.log("✅ Session successfully verified");
        return verifiedToken.payload;

        // CASE: token and master key don't match return Unauthorized
    } catch (error) {
        console.error("❌ Something went wrong", error);
        return null;
    }

}