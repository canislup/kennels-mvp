import { prisma } from "@/lib/db";

export default async function Home() {

    // 1. Fetch all kennels from the database
  const kennels = await prisma.kennel.findMany();

  return (
      <main className="min-h-screen p-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Kennel MVP</h1>

        {kennels.length === 0 ? (
            <p className="text-gray-500">No kennels registered yet. The database is empty!</p>
        ) : (
            <ul className="space-y-4">
              {kennels.map((kennel) => (
                  <li key={kennel.id} className="p-4 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">{kennel.name}</h2>
                    <p className="text-gray-600">{kennel.city}, {kennel.state}</p>
                  </li>
              ))}
            </ul>
        )}
      </main>
  );
}