// REAL LOGIC: keep when the backend lands. Not a mock: these are the server-side
// validation rules for the litter form (create and edit).
//
// parseLitterFormData() whitelists the keys the form may send;
// validateLitterInput() checks them and returns errors as translation keys
// (dashboard.common.errors.*) + params.
import type { FieldError, LitterFormField, LitterForEdit, LitterInput, LitterStatus, ParentOption } from "../types";

export const LITTER_LIMITS = { name: 60, puppyCount: 20 } as const;

export const LITTER_STATUSES: readonly LitterStatus[] = ["PLANNED", "AVAILABLE", "RESERVED", "SOLD_OUT"];

/** Raw values as typed, echoed back on errors so nothing is lost. */
export type LitterFormValues = {
    name: string;
    breed: string;
    status: string;
    damId: string;
    sireId: string;
    birthDate: string;
    expectedGoHomeDate: string;
    puppyCount: string;
};

export type LitterFieldErrors = Partial<Record<LitterFormField, FieldError>>;

const text = (formData: FormData, key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
};

export function parseLitterFormData(formData: FormData): LitterFormValues {
    return {
        name: text(formData, "name"),
        breed: text(formData, "breed"),
        status: text(formData, "status"),
        damId: text(formData, "damId"),
        sireId: text(formData, "sireId"),
        birthDate: text(formData, "birthDate"),
        expectedGoHomeDate: text(formData, "expectedGoHomeDate"),
        puppyCount: text(formData, "puppyCount"),
    };
}

/** YYYY-MM-DD that is a real calendar date. */
const isValidDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function validateLitterInput(
    values: LitterFormValues,
    context: {
        breedNames: string[];
        females: ParentOption[];
        males: ParentOption[];
        /** Breeds of the puppies already linked to this litter (edit only). */
        linkedPuppyBreeds?: string[];
    },
): { ok: true; input: LitterInput } | { ok: false; fieldErrors: LitterFieldErrors } {
    const errors: LitterFieldErrors = {};
    const today = new Date().toISOString().slice(0, 10);

    if (!values.name) errors.name = { key: "required" };
    else if (values.name.length > LITTER_LIMITS.name) errors.name = { key: "tooLong", params: { max: LITTER_LIMITS.name } };

    if (!values.breed) errors.breed = { key: "required" };
    else if (!context.breedNames.includes(values.breed)) errors.breed = { key: "invalidBreed" };
    else if (context.linkedPuppyBreeds?.some((breed) => breed !== values.breed)) errors.breed = { key: "breedHasPuppies" };

    if (!LITTER_STATUSES.includes(values.status as LitterStatus)) errors.status = { key: values.status ? "invalidChoice" : "required" };

    // Parents: an adult of the right sex and the litter's breed, from this kennel.
    const checkParent = (field: "damId" | "sireId", options: ParentOption[], key: string) => {
        const id = values[field];
        if (!id) return;
        const parent = options.find((option) => option.id === id);
        if (!parent || (values.breed && parent.breed !== values.breed)) errors[field] = { key };
    };
    checkParent("damId", context.females, "invalidDam");
    checkParent("sireId", context.males, "invalidSire");

    if (values.birthDate) {
        if (!isValidDate(values.birthDate)) errors.birthDate = { key: "invalidDate" };
        else if (values.birthDate > today) errors.birthDate = { key: "futureLitterDate" };
    } else if (values.status && values.status !== "PLANNED" && !errors.status) {
        errors.birthDate = { key: "birthDateRequiredForStatus" };
    }

    if (values.expectedGoHomeDate) {
        if (!isValidDate(values.expectedGoHomeDate)) errors.expectedGoHomeDate = { key: "invalidDate" };
        else if (values.birthDate && !errors.birthDate && values.expectedGoHomeDate < values.birthDate) {
            errors.expectedGoHomeDate = { key: "goHomeBeforeBirth" };
        }
    }

    const count = values.puppyCount === "" ? 0 : Number(values.puppyCount);
    if (!Number.isInteger(count) || count < 0 || count > LITTER_LIMITS.puppyCount) {
        errors.puppyCount = { key: "puppyCountRange", params: { max: LITTER_LIMITS.puppyCount } };
    }

    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

    return {
        ok: true,
        input: {
            name: values.name,
            breed: values.breed,
            status: values.status as LitterStatus,
            damId: values.damId || null,
            sireId: values.sireId || null,
            birthDate: values.birthDate || null,
            expectedGoHomeDate: values.expectedGoHomeDate || null,
            puppyCount: count,
        },
    };
}

export function litterToFormValues(litter: LitterForEdit | null): LitterFormValues {
    return {
        name: litter?.name ?? "",
        breed: litter?.breed ?? "",
        status: litter?.status ?? "PLANNED",
        damId: litter?.damId ?? "",
        sireId: litter?.sireId ?? "",
        birthDate: litter?.birthDate ?? "",
        expectedGoHomeDate: litter?.expectedGoHomeDate ?? "",
        puppyCount: litter ? String(litter.puppyCount) : "0",
    };
}
