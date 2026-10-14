import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getKennelProfile, getProfileStrength, listBreedOptions } from "@/lib/dashboard/kennelProfile";
import { kennelProfileFormValues } from "@/lib/dashboard/validation/kennelProfile";
import { saveKennelProfileAction } from "./actions";
import KennelProfileForm from "@/components/dashboard/settings/profile/KennelProfileForm";
import ProfileStrengthCard from "@/components/dashboard/settings/profile/ProfileStrengthCard";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.settings");
    return { title: `${t("tabs.profile")} · ${t("title")}` };
}

/**
 * Kennel profile tab: one form (left) with a sticky Live preview and Profile
 * strength (right, from lg). Strength reflects saved data and re-renders
 * after a save (the action calls refresh()).
 */
export default async function KennelProfileSettingsPage() {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const [profile, breedOptions, strength] = await Promise.all([getKennelProfile(kennel.id), listBreedOptions(), getProfileStrength(kennel.id)]);
    if (!profile) notFound();

    return (
        // data-wide: the settings layout drops its narrow max width for this two-column tab.
        <div data-wide>
            <KennelProfileForm
                action={saveKennelProfileAction}
                savedValues={kennelProfileFormValues(profile)}
                savedSlug={profile.slug}
                savedBreeds={profile.breeds}
                breedOptions={breedOptions}
                savedRegistrationType={profile.registration.type}
                maskedNumber={profile.registration.maskedNumber}
                verificationStatus={profile.verificationStatus}
                publicPagePath={profile.publicPagePath}
                strength={<ProfileStrengthCard strength={strength} verificationStatus={profile.verificationStatus} />}
            />
        </div>
    );
}
