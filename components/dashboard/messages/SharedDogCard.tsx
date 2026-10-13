import { Link } from "@/i18n/navigation";

/** A shared dog inside the thread: photo, "Dog shared", name and details; links to the dog. */
export default function SharedDogCard({ dogId, name, meta, label, coverPhotoUrl, align }: { dogId: string; name: string; meta: string; label: string; coverPhotoUrl: string | null; align: "start" | "end" }) {
    return (
        <Link
            href={`/dashboard/dogs/${dogId}/edit`}
            className={`flex max-w-[85%] items-center gap-3 rounded-[14px] border border-line bg-white p-2.5 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${align === "end" ? "self-end" : "self-start"}`}
        >
            <span className="size-13 shrink-0 overflow-hidden rounded-[10px] bg-linear-135 from-sand-light to-sand-dark">
                {coverPhotoUrl && <img src={coverPhotoUrl} alt="" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0">
                <span className="block text-[11px] font-semibold tracking-[0.4px] text-stone-500 uppercase">{label}</span>
                <span className="block truncate text-sm font-semibold text-stone-900">{name}</span>
                <span className="block truncate text-xs text-stone-600">{meta}</span>
            </span>
        </Link>
    );
}
