"use client";

import { useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { MapPin, Search } from "lucide-react";
import { lookupAddressAction } from "@/app/[locale]/dashboard/settings/actions";
import Button from "@/components/dashboard/ui/Button";
import Field from "@/components/dashboard/ui/Field";
import TextInput from "@/components/dashboard/ui/TextInput";
import { notifyFormChange } from "@/components/dashboard/ui/SaveBar";

type Lookup = { state: "idle" } | { state: "found"; formatted: string } | { state: "notFound" } | { state: "failed" };

const toNumber = (value: string) => {
    const n = Number(value.replace(",", "."));
    return value.trim() !== "" && Number.isFinite(n) ? n : null;
};

/**
 * Address + "Look up" (a button, never a submit), a placeholder map block with
 * the coordinates, and the latitude/longitude fields themselves, so the
 * coordinates can be typed by hand and the form saves without JavaScript.
 */
export default function LocationFields({ address, latitude, longitude, error }: { address: string; latitude: string; longitude: string; error: (field: string) => string | undefined }) {
    const t = useTranslations("dashboard.settings.profile.location");
    const format = useFormatter();
    const [coords, setCoords] = useState({ lat: latitude, lng: longitude });
    const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
    const [pending, startTransition] = useTransition();
    const addressRef = useRef<HTMLInputElement>(null);
    const latRef = useRef<HTMLInputElement>(null);
    const lngRef = useRef<HTMLInputElement>(null);

    function runLookup() {
        const text = addressRef.current?.value.trim() ?? "";
        if (!text) {
            setLookup({ state: "notFound" });
            return;
        }
        startTransition(async () => {
            const result = await lookupAddressAction(text).catch(() => undefined);
            if (result === undefined) return setLookup({ state: "failed" });
            if (!result) return setLookup({ state: "notFound" });
            const lat = String(result.lat);
            const lng = String(result.lng);
            if (latRef.current) latRef.current.value = lat;
            if (lngRef.current) lngRef.current.value = lng;
            setCoords({ lat, lng });
            setLookup({ state: "found", formatted: result.formatted });
            notifyFormChange(latRef.current);
        });
    }

    const lat = toNumber(coords.lat);
    const lng = toNumber(coords.lng);
    const coordinate = (n: number) => format.number(n, { maximumFractionDigits: 4 });

    return (
        <>
            <div className="mb-4 flex flex-wrap items-end gap-2.5">
                <Field id="profile-address" label={t("address")} error={error("address")} className="flex-[1_1_260px]">
                    {(control) => (
                        <TextInput
                            {...control}
                            ref={addressRef}
                            name="address"
                            defaultValue={address}
                            autoComplete="street-address"
                            onKeyDown={(event) => {
                                // Enter looks the address up instead of submitting the whole form.
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    runLookup();
                                }
                            }}
                        />
                    )}
                </Field>
                <Button variant="secondary" onClick={runLookup} disabled={pending} aria-busy={pending} className={error("address") ? "mb-6.5" : ""}>
                    <Search className="size-4" aria-hidden />
                    {pending ? t("lookingUp") : t("lookUp")}
                </Button>
            </div>
            <p role="status" aria-live="polite" className="mb-3 text-[13px] empty:hidden">
                {lookup.state === "found" && <span className="text-status-green">{t("found", { place: lookup.formatted })}</span>}
                {lookup.state === "notFound" && <span className="font-medium text-status-red">{t("notFound")}</span>}
                {lookup.state === "failed" && <span className="font-medium text-status-red">{t("failed")}</span>}
            </p>

            <div className="mb-3 flex h-40 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-stone-50 text-[13px] text-stone-500" aria-hidden>
                <MapPin className={`size-6 ${lat !== null && lng !== null ? "text-accent" : ""}`} />
                {lat !== null && lng !== null ? t("readout", { lat: coordinate(lat), lng: coordinate(lng) }) : t("noCoordinates")}
            </div>

            <div className="grid grid-cols-2 gap-4.5">
                <Field id="profile-latitude" label={t("latitude")} error={error("latitude")}>
                    {(control) => (
                        <TextInput
                            {...control}
                            ref={latRef}
                            name="latitude"
                            defaultValue={latitude}
                            inputMode="decimal"
                            autoComplete="off"
                            onChange={(event) => setCoords((current) => ({ ...current, lat: event.target.value }))}
                        />
                    )}
                </Field>
                <Field id="profile-longitude" label={t("longitude")} error={error("longitude")}>
                    {(control) => (
                        <TextInput
                            {...control}
                            ref={lngRef}
                            name="longitude"
                            defaultValue={longitude}
                            inputMode="decimal"
                            autoComplete="off"
                            onChange={(event) => setCoords((current) => ({ ...current, lng: event.target.value }))}
                        />
                    )}
                </Field>
            </div>
            <p className="mt-1.5 text-xs text-stone-500">{t("coordinatesHelp")}</p>
        </>
    );
}
