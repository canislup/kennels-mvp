import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children } : { children: React.ReactNode; }) {
    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            {/* The fixed Sidebar on the left */}
            <Sidebar />

            {/* The dynamic page content on the right */}
            <div className="flex-1 flex flex-col">
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}