import { redirect } from "next/navigation";
import { verifyKennelSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DogCard from "@/components/DogCard";
import AddDogModal from "@/components/AddDogModal";

export default async function DashboardPage() {
    const payload = await verifyKennelSession();
    if (!payload) redirect("/login");

    const ownerId = payload.userID as string;
    const [kennel, breeds] = await Promise.all([
        prisma.kennel.findUnique({
            where: { ownerId: ownerId },
            include: { dogs: { orderBy: { createdAt: "desc" } } }
        }),
        prisma.breed.findMany({
            orderBy: { name: 'asc' } // Alphabetical order for the dropdown
        })
    ]);

    if (!kennel) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup Your Kennel</h1>
                    <p className="text-slate-500">Complete your profile to unlock the dashboard.</p>
                </div>
            </div>
        );
    }

    const dogs = kennel.dogs;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Overview</h2>
                    <p className="text-slate-500 mt-2 font-medium text-sm">
                        Welcome back to {kennel.name}
                    </p>
                </div>
                <AddDogModal availableBreeds={breeds} />
            </div>

            {/* Dashboard Grid */}
            {dogs.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">No dogs found</h3>
                    <p className="text-slate-500 font-medium mt-1">Get started by creating your first dog profile.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {dogs.map((dog) => (
                        <DogCard key={dog.id} dog={dog} />
                    ))}
                </div>
            )}
        </div>
    );
}