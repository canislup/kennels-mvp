"use client";

import { useState } from "react";
import { Edit, ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

// Adjust this type based on your actual schema/database return structure
type DogProps = {
    id: string;
    name: string;
    breed: string;
    gender: string;
    photoUrls?: string[]; // Array of strings representing image URLs
};

export default function DogCard({ dog }: { dog: DogProps }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Safely handle dogs that might not have photos yet
    const photos = dog.photoUrls && dog.photoUrls.length > 0 
        ? dog.photoUrls 
        : ["https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"]; // Fallback placeholder

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents the modal from opening when clicking the arrow
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents the modal from opening when clicking the arrow
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const openModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                
                {/* 2. Carousel Section */}
                <div 
                    className="relative h-56 w-full bg-slate-100 group/carousel cursor-pointer overflow-hidden" 
                    onClick={openModal}
                >
                    {/* The Image */}
                    <img 
                        src={photos[currentIndex]} 
                        alt={`${dog.name} - Photo ${currentIndex + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/carousel:scale-105"
                    />
                    
                    {/* Expand Icon Overlay */}
                    <div className="absolute top-3 right-3 bg-black/40 p-1.5 rounded-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity">
                        <Maximize2 className="w-4 h-4 text-white" />
                    </div>

                    {/* Carousel Controls (Only show if multiple photos exist) */}
                    {photos.length > 1 && (
                        <>
                            <button 
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-700" />
                            </button>
                            <button 
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-all"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-700" />
                            </button>
                            
                            {/* Dot Indicators */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {photos.map((_, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Card Content Section */}
                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{dog.name}</h3>
                            <p className="text-sm text-slate-500 font-medium">{dog.breed} • {dog.gender}</p>
                        </div>
                        
                        {/* 1. Edit Button (Replaced Breed Status) */}
                        <button 
                            className="text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2.5 rounded-xl transition-colors flex items-center justify-center"
                            title="Edit Dog"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Fullscreen Image Modal */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4" 
                    onClick={() => setIsModalOpen(false)}
                >
                    {/* Close Button */}
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    {/* Fullscreen Image */}
                    <img 
                        src={photos[currentIndex]} 
                        alt={`${dog.name} - Fullscreen`}
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()} // Prevent clicking the image from closing the modal
                    />
                    
                    {/* Modal Carousel Controls */}
                    {photos.length > 1 && (
                        <>
                            <button 
                                onClick={prevImage}
                                className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-colors"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button 
                                onClick={nextImage}
                                className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-colors"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

