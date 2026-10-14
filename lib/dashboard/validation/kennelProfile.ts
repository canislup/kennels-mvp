// REAL LOGIC: keep when the backend lands. Server-side rules for Settings →
// Kennel profile (one form, one Server Action). Errors are translation keys
// (dashboard.common.errors.*) + params. Safe to import from client code (the
// form uses the limits, option lists and the input mask); it has no server imports.
import type { ContactChannel, FieldError, KennelProfile, RegistrationType } from "../types";
import { EMAIL_MAX, EMAIL_PATTERN, textField } from "./common";

export const KENNEL_PROFILE_LIMITS = {
    nameMin: 2,
    nameMax: 80,
    slugMin: 3,
    slugMax: 40,
    cityMax: 80,
    description: 1000,
    breedsMax: 3,
    cbkcMax: 40,
    breedingSinceMin: 1950,
    addressMax: 200,
    websiteMax: 200,
    publicIdMax: 255,
} as const;

/** Never usable as a kennel slug (they clash with app routes). */
const RESERVED_SLUGS: readonly string[] = ["dashboard", "admin", "api", "login", "signup", "kennel", "kennels", "settings"];

/** The 27 Brazilian federative units. */
export const BR_STATES: readonly string[] = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
    "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

/** IANA zones offered at launch; labels are dashboard.settings.profile.timeZone.zones.<key>. */
export const TIME_ZONES = [
    { value: "America/Sao_Paulo", key: "saoPaulo" },
    { value: "America/Fortaleza", key: "fortaleza" },
    { value: "America/New_York", key: "eastern" },
    { value: "America/Chicago", key: "central" },
    { value: "America/Denver", key: "mountain" },
    { value: "America/Phoenix", key: "arizona" },
    { value: "America/Los_Angeles", key: "pacific" },
    { value: "America/Anchorage", key: "alaska" },
    { value: "Pacific/Honolulu", key: "hawaii" },
] as const;

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export const CONTACT_CHANNELS: readonly ContactChannel[] = ["phone", "email", "website", "instagram", "whatsapp"];

// --- Slugs ------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Format and reserved-word check (uniqueness needs the database: see checkSlugAvailability). */
export function slugProblem(slug: string): "invalid" | "reserved" | undefined {
    if (slug.length < KENNEL_PROFILE_LIMITS.slugMin || slug.length > KENNEL_PROFILE_LIMITS.slugMax || !SLUG_PATTERN.test(slug)) return "invalid";
    if (RESERVED_SLUGS.includes(slug)) return "reserved";
    return undefined;
}

// --- CNPJ / CPF -------------------------------------------------------------------

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

const REGISTRATION_LENGTH: Record<RegistrationType, number> = { CNPJ: 14, CPF: 11 };

/** Mod-11 check digit over `digits` with the given weights. */
function checkDigit(digits: string, weights: number[]): number {
    const sum = weights.reduce((total, weight, i) => total + Number(digits[i]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
}

function isValidCnpj(value: string): boolean {
    const d = onlyDigits(value);
    if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    const first = checkDigit(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = checkDigit(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return first === Number(d[12]) && second === Number(d[13]);
}

function isValidCpf(value: string): boolean {
    const d = onlyDigits(value);
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const first = checkDigit(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = checkDigit(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return first === Number(d[9]) && second === Number(d[10]);
}

/** Input mask while typing ("12.345.678/0001-90", "123.456.789-09"). Client convenience only: the server strips it. */
export function formatRegistration(type: RegistrationType, value: string): string {
    const d = onlyDigits(value).slice(0, REGISTRATION_LENGTH[type]);
    const groups = type === "CNPJ" ? [2, 3, 3, 4, 2] : [3, 3, 3, 2];
    const separators = type === "CNPJ" ? [".", ".", "/", "-"] : [".", ".", "-"];
    let out = "";
    let index = 0;
    groups.forEach((size, i) => {
        const part = d.slice(index, index + size);
        index += size;
        if (!part) return;
        out += (i > 0 ? separators[i - 1] : "") + part;
    });
    return out;
}

/** "••.•••.•••/••••-90" / "•••.•••.•••-09": only the last two digits are shown. */
export function maskRegistration(type: RegistrationType, digits: string): string {
    const template = type === "CNPJ" ? "••.•••.•••/••••-" : "•••.•••.•••-";
    return template + digits.slice(-2);
}

// --- Form values (what the form posts and gets back on an error) -----------------

export type KennelProfileFormValues = {
    name: string;
    slug: string;
    city: string;
    state: string;
    description: string;
    timeZone: string;
    logoUrl: string;
    logoPublicId: string;
    coverUrl: string;
    coverPublicId: string;
    breedIds: string[];
    registrationType: string;
    /** A NEW number typed by the user; "" keeps the one on file. Never prefilled. */
    registrationNumber: string;
    cbkcRegistration: string;
    breedingSince: string;
    contact: Record<ContactChannel, { value: string; isPublic: boolean }>;
    address: string;
    latitude: string;
    longitude: string;
};

export function parseKennelProfile(formData: FormData): KennelProfileFormValues {
    const contact = {} as KennelProfileFormValues["contact"];
    for (const channel of CONTACT_CHANNELS) contact[channel] = { value: textField(formData, channel), isPublic: formData.get(`${channel}Public`) === "on" };
    return {
        name: textField(formData, "name"),
        slug: textField(formData, "slug"),
        city: textField(formData, "city"),
        state: textField(formData, "state"),
        description: textField(formData, "description"),
        timeZone: textField(formData, "timeZone"),
        logoUrl: textField(formData, "logoUrl"),
        logoPublicId: textField(formData, "logoPublicId"),
        coverUrl: textField(formData, "coverUrl"),
        coverPublicId: textField(formData, "coverPublicId"),
        breedIds: formData.getAll("breedIds").filter((v): v is string => typeof v === "string" && v !== ""),
        registrationType: textField(formData, "registrationType"),
        registrationNumber: textField(formData, "registrationNumber"),
        cbkcRegistration: textField(formData, "cbkcRegistration"),
        breedingSince: textField(formData, "breedingSince"),
        contact,
        address: textField(formData, "address"),
        latitude: textField(formData, "latitude"),
        longitude: textField(formData, "longitude"),
    };
}

// --- Validated input (what lib/dashboard writes) ------------------------------------

type Image = { url: string; publicId: string | null } | null;

export type KennelIdentityInput = { name: string; slug: string; city: string; state: string; description: string | null; timeZone: string };
export type KennelImagesInput = { logo: Image; cover: Image };
export type KennelRegistrationInput = {
    type: RegistrationType | null;
    /** Digits only; null keeps the number on file. */
    number: string | null;
    cbkcRegistration: string | null;
    breedingSince: number | null;
};
export type KennelContactInput = Record<ContactChannel, { value: string | null; isPublic: boolean }>;
export type KennelLocationInput = { address: string | null; latitude: number | null; longitude: number | null };

export type KennelProfileInput = {
    identity: KennelIdentityInput;
    images: KennelImagesInput;
    breedIds: string[];
    registration: KennelRegistrationInput;
    contact: KennelContactInput;
    location: KennelLocationInput;
};

/** What's on file, for the rules that compare with it. */
export type KennelProfileContext = {
    savedLogoUrl: string | null;
    savedCoverUrl: string | null;
    savedRegistrationType: RegistrationType | null;
    currentYear: number;
};

const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";
const PHONE_PATTERN = /^\+?\d{10,15}$/;
const INSTAGRAM_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_\-/.]+$/;

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
    } catch {
        return false;
    }
}

/** Accepts "-25.4284" and "-25,4284" (pt-BR keyboards). NaN when not a number. */
function parseCoordinate(value: string): number {
    const normalized = value.replace(",", ".");
    return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

/** A new image must be a Cloudinary upload; the saved one may stay as it is. */
function image(url: string, publicId: string, saved: string | null, errors: Record<string, FieldError>, field: string): Image {
    if (!url) return null;
    if (url !== saved && !url.startsWith(CLOUDINARY_PREFIX)) {
        errors[field] = { key: "invalidUpload" };
        return null;
    }
    const id = publicId && publicId.length <= KENNEL_PROFILE_LIMITS.publicIdMax && PUBLIC_ID_PATTERN.test(publicId) ? publicId : null;
    return { url, publicId: id };
}

/**
 * Every rule that needs no database. The caller adds the database ones (slug
 * taken, breeds exist, registration number used by another kennel) before
 * writing anything.
 */
export function validateKennelProfile(
    values: KennelProfileFormValues,
    context: KennelProfileContext,
): { ok: true; input: KennelProfileInput } | { ok: false; fieldErrors: Record<string, FieldError> } {
    const L = KENNEL_PROFILE_LIMITS;
    const errors: Record<string, FieldError> = {};

    // Identity
    if (!values.name) errors.name = { key: "required" };
    else if (values.name.length < L.nameMin) errors.name = { key: "tooShort", params: { min: L.nameMin } };
    else if (values.name.length > L.nameMax) errors.name = { key: "tooLong", params: { max: L.nameMax } };
    const slugIssue = values.slug ? slugProblem(values.slug) : "required";
    if (slugIssue === "required") errors.slug = { key: "required" };
    else if (slugIssue === "invalid") errors.slug = { key: "slugInvalid", params: { min: L.slugMin, max: L.slugMax } };
    else if (slugIssue === "reserved") errors.slug = { key: "slugReserved" };
    if (!values.city) errors.city = { key: "required" };
    else if (values.city.length > L.cityMax) errors.city = { key: "tooLong", params: { max: L.cityMax } };
    if (!BR_STATES.includes(values.state)) errors.state = { key: "invalidChoice" };
    if (values.description.length > L.description) errors.description = { key: "tooLong", params: { max: L.description } };
    if (!TIME_ZONES.some((zone) => zone.value === values.timeZone)) errors.timeZone = { key: "invalidChoice" };

    // Logo and cover. The UI has no way to remove a saved logo.
    const logo = image(values.logoUrl, values.logoPublicId, context.savedLogoUrl, errors, "logoUrl");
    if (!values.logoUrl && context.savedLogoUrl) errors.logoUrl = { key: "logoRequired" };
    const cover = image(values.coverUrl, values.coverPublicId, context.savedCoverUrl, errors, "coverUrl");

    // Breeds (that they exist is checked against the Breed table by the caller)
    const breedIds = [...new Set(values.breedIds)];
    if (breedIds.length === 0) errors.breedIds = { key: "breedsRequired" };
    else if (breedIds.length > L.breedsMax) errors.breedIds = { key: "tooManyBreeds", params: { max: L.breedsMax } };

    // Registration
    let type: RegistrationType | null = values.registrationType === "CNPJ" || values.registrationType === "CPF" ? values.registrationType : null;
    if (values.registrationType && !type) errors.registrationType = { key: "invalidChoice" };
    let number: string | null = null;
    if (values.registrationNumber) {
        number = onlyDigits(values.registrationNumber);
        if (type === "CNPJ" && !isValidCnpj(number)) errors.registrationNumber = { key: "cnpjInvalid" };
        else if (type === "CPF" && !isValidCpf(number)) errors.registrationNumber = { key: "cpfInvalid" };
        else if (!type) errors.registrationType = { key: "invalidChoice" };
    } else if (type && context.savedRegistrationType && type !== context.savedRegistrationType) {
        // Switched type without typing a number: the one on file stays until a new one is saved.
        errors.registrationNumber = { key: type === "CNPJ" ? "cnpjRequired" : "cpfRequired" };
    } else {
        type = context.savedRegistrationType;
    }
    if (values.cbkcRegistration.length > L.cbkcMax) errors.cbkcRegistration = { key: "tooLong", params: { max: L.cbkcMax } };
    let breedingSince: number | null = null;
    if (values.breedingSince) {
        breedingSince = /^\d{4}$/.test(values.breedingSince) ? Number(values.breedingSince) : NaN;
        if (!(breedingSince >= L.breedingSinceMin && breedingSince <= context.currentYear)) {
            // Years as strings: a number param would be formatted ("2.026" in pt-BR).
            errors.breedingSince = { key: "yearRange", params: { min: String(L.breedingSinceMin), max: String(context.currentYear) } };
        }
    }

    // Contact: a row can be shown only with a value.
    const contact = {} as KennelContactInput;
    for (const channel of CONTACT_CHANNELS) {
        const { value, isPublic } = values.contact[channel];
        let stored: string | null = value || null;
        if (value) {
            if (channel === "phone" || channel === "whatsapp") {
                if (!PHONE_PATTERN.test(value.replace(/[\s().-]/g, ""))) errors[channel] = { key: "phoneDigits" };
            } else if (channel === "email") {
                if (value.length > EMAIL_MAX || !EMAIL_PATTERN.test(value)) errors[channel] = { key: "invalidEmail" };
                stored = value.toLowerCase();
            } else if (channel === "website") {
                if (value.length > L.websiteMax || !isHttpUrl(value)) errors[channel] = { key: "invalidUrl" };
            } else {
                stored = value.replace(/^@/, "");
                if (!INSTAGRAM_PATTERN.test(stored)) errors[channel] = { key: "instagramInvalid" };
            }
        } else if (isPublic) {
            errors[channel] = { key: "publicNeedsValue" };
        }
        contact[channel] = { value: stored, isPublic: isPublic && Boolean(value) };
    }

    // Location: both coordinates or neither.
    if (values.address.length > L.addressMax) errors.address = { key: "tooLong", params: { max: L.addressMax } };
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (values.latitude || values.longitude) {
        latitude = parseCoordinate(values.latitude);
        longitude = parseCoordinate(values.longitude);
        if (!values.latitude) errors.latitude = { key: "coordinatesPair" };
        else if (!(latitude >= -90 && latitude <= 90)) errors.latitude = { key: "latitudeRange" };
        if (!values.longitude) errors.longitude = { key: "coordinatesPair" };
        else if (!(longitude >= -180 && longitude <= 180)) errors.longitude = { key: "longitudeRange" };
    }

    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
    return {
        ok: true,
        input: {
            identity: { name: values.name, slug: values.slug, city: values.city, state: values.state, description: values.description || null, timeZone: values.timeZone },
            images: { logo, cover },
            breedIds,
            registration: { type, number, cbkcRegistration: values.cbkcRegistration || null, breedingSince },
            contact,
            location: { address: values.address || null, latitude, longitude },
        },
    };
}

/** The saved profile as form values (the registration number is never prefilled: only its mask is shown). */
export function kennelProfileFormValues(profile: KennelProfile): KennelProfileFormValues {
    return {
        name: profile.name,
        slug: profile.slug,
        city: profile.city,
        state: profile.state,
        description: profile.description,
        timeZone: profile.timeZone,
        logoUrl: profile.logo?.url ?? "",
        logoPublicId: profile.logo?.publicId ?? "",
        coverUrl: profile.cover?.url ?? "",
        coverPublicId: profile.cover?.publicId ?? "",
        breedIds: profile.breeds.map((breed) => breed.id),
        registrationType: profile.registration.type ?? "CNPJ",
        registrationNumber: "",
        cbkcRegistration: profile.registration.cbkcRegistration ?? "",
        breedingSince: profile.registration.breedingSince?.toString() ?? "",
        contact: structuredClone(profile.contact),
        address: profile.location.address,
        latitude: profile.location.latitude?.toString() ?? "",
        longitude: profile.location.longitude?.toString() ?? "",
    };
}
