"use client"

import { useState } from 'react'
import { prisma } from "@/lib/db";
import {Plus, Pencil, X} from "lucide-react";


export default function DogEditModal({ dog }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsOpen(true);

        const name = formData.get("name");
        const gender = formData.get("gender");
        const breed = formData.get("breed");
        const status = formData.get("status");
        const lineage = formData.get("lineage");

        console.log("Here is the info: ",name, gender, breed, status);
    }

    const handleClick = () => {
        console.log("Here is the info: ", dog);
    }

    return (
        <>
            <button
                onClick={() => {
                    setIsOpen(true)
                    handleClick();
                }}
                // onClick={handleClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
            >
                <Pencil className="w-5 h-5" /> Edit dog
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-900">Edite o seu cachorro</h3>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>


                        <form action={handleSubmit} className={"p-10"}>
                            <label >Nome</label>
                            <input type={"text"}
                                   name={"name"}
                                   placeholder={`${dog.name}`}
                                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all" />
                        </form>
                    </div>
                </div>
            )}

        </>
    )
}