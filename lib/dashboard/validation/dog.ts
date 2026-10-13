// REAL LOGIC: keep when the backend lands. Not a mock: these are the server-side
// validation rules for the Dog-Edit form, shared by createDog and updateDog.
//
// parseDogFormData() whitelists the fields the form may send (nothing else
// from FormData reaches the data layer); validateDogInput() checks them and
// returns errors as translation keys (dashboard.common.errors.*) + params.
import type { DogFormField, DogInput, DogLifeStage, DogSex, DogStatus, FieldError, HealthDocument } from "../types";

export const DOG_LIMITS = {
    name: 60,
    registry: 40,
    registrationNumber: 40,
    lineage: 60,
    parentName: 80,
    bio: 800,
    photos: 8,
    healthDocuments: 10,
    documentLabel: 80,
} as const;

export const DOG_STATUSES: readonly DogStatus[] = ["BREEDING_STOCK", "AVAILABLE_PUPPY", "RESERVED", "SOLD"];
export const DOG_SEXES: readonly DogSex[] = ["MALE", "FEMALE"];
export const DOG_LIFE_STAGES: readonly DogLifeStage[] = ["PUPPY", "ADULT"];

/** Raw form values as typed (strings), echoed back on errors so nothing the user typed is lost. */
export type DogFormValues = {
    name: string;
    breed: string;
    sex: string;
    lifeStage: string;
    birthDate: string;
    status: string;
    litterId: string;
    registry: string;
    registrationNumber: string;
    lineage: string;
    pedigreeUrl: string;
    sireName: string;
    damName: string;
    bio: string;
    photos: string[];
    healthDocuments: HealthDocument[];
};

export type DogFieldErrors = Partial<Record<DogFormField, FieldError>>;

const text = (formData: FormData, key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
};

function parseDocument(raw: FormDataEntryValue): HealthDocument | null {
    if (typeof raw !== "string") return null;
    try {
        const value = JSON.parse(raw) as Record<string, unknown>;
        const pick = (key: string) => (typeof value[key] === "string" ? (value[key] as string).trim() : "");
        return { id: pick("id"), url: pick("url"), label: pick("label"), fileName: pick("fileName") };
    } catch {
        return null;
    }
}

/** Builds the typed form values from FormData. Only these keys are read. */
export function parseDogFormData(formData: FormData): DogFormValues {
    return {
        name: text(formData, "name"),
        breed: text(formData, "breed"),
        sex: text(formData, "sex"),
        lifeStage: text(formData, "lifeStage"),
        birthDate: text(formData, "birthDate"),
        status: text(formData, "status"),
        litterId: text(formData, "litterId"),
        registry: text(formData, "registry"),
        registrationNumber: text(formData, "registrationNumber"),
        lineage: text(formData, "lineage"),
        pedigreeUrl: text(formData, "pedigreeUrl"),
        sireName: text(formData, "sireName"),
        damName: text(formData, "damName"),
        bio: text(formData, "bio"),
        photos: formData.getAll("photoUrls").filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim()),
        healthDocuments: formData
            .getAll("healthDocument")
            .map(parseDocument)
            .filter((doc): doc is HealthDocument => doc !== null),
    };
}

const isHttpUrl = (value: string, httpsOnly = false) => {
    try {
        const url = new URL(value);
        return httpsOnly ? url.protocol === "https:" : url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

/** YYYY-MM-DD that is a real calendar date. */
const isValidDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export function validateDogInput(
    values: DogFormValues,
    context: { breedNames: string[]; litterIds: string[] },
): { ok: true; input: DogInput } | { ok: false; fieldErrors: DogFieldErrors } {
    const errors: DogFieldErrors = {};
    const tooLong = (field: DogFormField, value: string, max: number) => {
        if (value.length > max) errors[field] = { key: "tooLong", params: { max } };
    };

    if (!values.name) errors.name = { key: "required" };
    else tooLong("name", values.name, DOG_LIMITS.name);

    if (!values.breed) errors.breed = { key: "required" };
    else if (!context.breedNames.includes(values.breed)) errors.breed = { key: "invalidBreed" };

    if (!values.sex) errors.sex = { key: "required" };
    else if (!DOG_SEXES.includes(values.sex as DogSex)) errors.sex = { key: "invalidChoice" };

    if (!values.lifeStage) errors.lifeStage = { key: "required" };
    else if (!DOG_LIFE_STAGES.includes(values.lifeStage as DogLifeStage)) errors.lifeStage = { key: "invalidChoice" };

    if (!DOG_STATUSES.includes(values.status as DogStatus)) errors.status = { key: values.status ? "invalidChoice" : "required" };

    if (values.birthDate) {
        if (!isValidDate(values.birthDate)) errors.birthDate = { key: "invalidDate" };
        else if (values.birthDate > todayIso()) errors.birthDate = { key: "futureDate" };
    }

    if (values.litterId) {
        if (values.lifeStage !== "PUPPY") errors.litterId = { key: "litterPuppiesOnly" };
        else if (!context.litterIds.includes(values.litterId)) errors.litterId = { key: "invalidChoice" };
    }

    tooLong("registry", values.registry, DOG_LIMITS.registry);
    tooLong("registrationNumber", values.registrationNumber, DOG_LIMITS.registrationNumber);
    tooLong("lineage", values.lineage, DOG_LIMITS.lineage);
    tooLong("sireName", values.sireName, DOG_LIMITS.parentName);
    tooLong("damName", values.damName, DOG_LIMITS.parentName);
    tooLong("bio", values.bio, DOG_LIMITS.bio);

    if (values.pedigreeUrl && !isHttpUrl(values.pedigreeUrl)) errors.pedigreeUrl = { key: "invalidUrl" };

    if (values.photos.length > DOG_LIMITS.photos) errors.photos = { key: "tooManyPhotos", params: { max: DOG_LIMITS.photos } };
    else if (values.photos.some((url) => !isHttpUrl(url, true))) errors.photos = { key: "invalidPhoto" };

    if (values.healthDocuments.length > DOG_LIMITS.healthDocuments) {
        errors.healthDocuments = { key: "tooManyDocuments", params: { max: DOG_LIMITS.healthDocuments } };
    } else if (
        values.healthDocuments.some(
            (doc) => !doc.id || !doc.label || doc.label.length > DOG_LIMITS.documentLabel || !isHttpUrl(doc.url, true),
        )
    ) {
        errors.healthDocuments = { key: "invalidDocument" };
    }

    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

    const orNull = (value: string) => value || null;
    return {
        ok: true,
        input: {
            name: values.name,
            breed: values.breed,
            sex: values.sex as DogSex,
            lifeStage: values.lifeStage as DogLifeStage,
            birthDate: orNull(values.birthDate),
            status: values.status as DogStatus,
            litterId: values.lifeStage === "PUPPY" ? orNull(values.litterId) : null,
            registry: orNull(values.registry),
            registrationNumber: orNull(values.registrationNumber),
            lineage: orNull(values.lineage),
            pedigreeUrl: orNull(values.pedigreeUrl),
            sireName: orNull(values.sireName),
            damName: orNull(values.damName),
            bio: orNull(values.bio),
            photos: values.photos,
            healthDocuments: values.healthDocuments,
        },
    };
}

/** Form values for an existing dog (edit) or a blank form (create). */
export function dogToFormValues(dog: DogInput | null): DogFormValues {
    return {
        name: dog?.name ?? "",
        breed: dog?.breed ?? "",
        sex: dog?.sex ?? "",
        lifeStage: dog?.lifeStage ?? "",
        birthDate: dog?.birthDate ?? "",
        status: dog?.status ?? "BREEDING_STOCK",
        litterId: dog?.litterId ?? "",
        registry: dog?.registry ?? "",
        registrationNumber: dog?.registrationNumber ?? "",
        lineage: dog?.lineage ?? "",
        pedigreeUrl: dog?.pedigreeUrl ?? "",
        sireName: dog?.sireName ?? "",
        damName: dog?.damName ?? "",
        bio: dog?.bio ?? "",
        photos: dog?.photos ?? [],
        healthDocuments: dog?.healthDocuments ?? [],
    };
}
