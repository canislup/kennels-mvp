"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Dog,
    Baby,
    Store,
    Settings,
    LogOut
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Plantel", href: "/dashboard/roster", icon: Dog },
        { name: "Ninhadas", href: "/dashboard/litters", icon: Baby },
        { name: "Perfil", href: "/dashboard/profile", icon: Store },
        { name: "Configurações", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-100 flex flex-col min-h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-8 border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-200">
                        <Dog className="text-white w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-slate-900">KennelOS</span>
                </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 px-4 py-6 space-y-1.5">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                                isActive
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-50">
                <button className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-medium">
                    <LogOut className="w-5 h-5 text-slate-400" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}