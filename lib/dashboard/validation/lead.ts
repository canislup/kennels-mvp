// REAL LOGIC: keep when the backend lands. Not a mock: server-side validation
// for the Add lead form. parseLeadFormData() whitelists the keys the form may
// send; validateLeadInput() returns errors as translation keys
// (dashboard.common.errors.*) + params.
import { EMAIL_PATTERN } from "./common";
import type { FieldError, LeadFormField, LeadFormOptions, LeadInput, LeadSource, LeadStage, PreferredContact } from "../types";

export const LEAD_LIMITS = { name: 80, email: 254, city: 60, state: 40, interestNote: 120 } as const;

/** Lead page: a note, and the optional note on a waitlist entry. */
export const LEAD_NOTE_MAX = 2000;
export const WAITLIST_NOTE_MAX = 200;

const STAGES: readonly LeadStage[] = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "RESERVED", "SOLD"];
const SOURCES: readonly LeadSource[] = ["PUBLIC_FORM", "DIRECTORY", "REFERRAL", "OTHER"];
const CONTACTS: readonly PreferredContact[] = ["EMAIL", "PHONE", "WHATSAPP"];

/** Raw values as typed, echoed back on errors so nothing is lost. */
export type LeadFormValues = {
    name: string;
    email: string;
    phone: string;
    preferredContact: string;
    city: string;
    state: string;
    source: string;
    stage: string;
    interestBreed: string;
    litterId: string;
    dogId: string;
    interestNote: string;
    followUpAt: string;
};

export type LeadFieldErrors = Partial<Record<LeadFormField, FieldError>>;

const KEYS: (keyof LeadFormValues)[] = [
    "name",
    "email",
    "phone",
    "preferredContact",
    "city",
    "state",
    "source",
    "stage",
    "interestBreed",
    "litterId",
    "dogId",
    "interestNote",
    "followUpAt",
];

export function parseLeadFormData(formData: FormData): LeadFormValues {
    const values = {} as LeadFormValues;
    for (const key of KEYS) {
        const value = formData.get(key);
        values[key] = typeof value === "string" ? value.trim() : "";
    }
    return values;
}

const PHONE = /^[0-9 +\-()]{8,20}$/;

const isValidDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function validateLeadInput(
    values: LeadFormValues,
    context: LeadFormOptions & {
        /** The viewer's calendar day. */
        today: string;
        /** Edit: the lead's current stage, used instead of the form (the stage isn't editable there). */
        stage?: LeadStage;
        /** Edit: the saved follow-up, which may be kept even if it's now in the past. */
        unchangedFollowUp?: string | null;
    },
): { ok: true; input: LeadInput } | { ok: false; fieldErrors: LeadFieldErrors } {
    const errors: LeadFieldErrors = {};
    const tooLong = (field: LeadFormField, max: number) => {
        if ((values[field as keyof LeadFormValues] ?? "").length > max) errors[field] = { key: "tooLong", params: { max } };
    };

    if (!values.name) errors.name = { key: "required" };
    else tooLong("name", LEAD_LIMITS.name);

    if (!values.email && !values.phone) {
        errors.email = { key: "contactRequired" };
    } else {
        if (values.email && (!EMAIL_PATTERN.test(values.email) || values.email.length > LEAD_LIMITS.email)) errors.email = { key: "invalidEmail" };
        if (values.phone && !PHONE.test(values.phone)) errors.phone = { key: "invalidPhone" };
    }

    if (!CONTACTS.includes(values.preferredContact as PreferredContact)) {
        errors.preferredContact = { key: values.preferredContact ? "invalidChoice" : "required" };
    } else if (values.preferredContact === "EMAIL" && !values.email && !errors.email) {
        errors.preferredContact = { key: "preferredNeedsEmail" };
    } else if (values.preferredContact !== "EMAIL" && !values.phone && !errors.email) {
        errors.preferredContact = { key: "preferredNeedsPhone" };
    }

    tooLong("city", LEAD_LIMITS.city);
    tooLong("state", LEAD_LIMITS.state);
    tooLong("interestNote", LEAD_LIMITS.interestNote);

    if (!SOURCES.includes(values.source as LeadSource)) errors.source = { key: values.source ? "invalidChoice" : "required" };
    const stage = context.stage ?? values.stage;
    if (!context.stage && !STAGES.includes(values.stage as LeadStage)) errors.stage = { key: values.stage ? "invalidChoice" : "required" };

    if (!values.interestBreed) errors.interestBreed = { key: "required" };
    else if (!context.breeds.some((breed) => breed.name === values.interestBreed)) errors.interestBreed = { key: "invalidBreed" };

    if (values.litterId) {
        const litter = context.litters.find((l) => l.id === values.litterId);
        if (!litter || litter.breed !== values.interestBreed) errors.litterId = { key: "invalidLitterForBreed" };
    }
    if (values.dogId) {
        const dog = context.dogs.find((d) => d.id === values.dogId);
        if (!dog || dog.breed !== values.interestBreed) errors.dogId = { key: "invalidDogForBreed" };
    }

    if (values.followUpAt) {
        if (!isValidDate(values.followUpAt)) errors.followUpAt = { key: "invalidDate" };
        else if (values.followUpAt < context.today && values.followUpAt !== context.unchangedFollowUp) errors.followUpAt = { key: "pastFollowUp" };
    }

    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

    const orNull = (value: string) => value || null;
    return {
        ok: true,
        input: {
            name: values.name,
            email: values.email ? values.email.toLowerCase() : null,
            phone: orNull(values.phone),
            preferredContact: values.preferredContact as PreferredContact,
            city: orNull(values.city),
            state: orNull(values.state),
            source: values.source as LeadSource,
            stage: stage as LeadStage,
            interestBreed: values.interestBreed,
            interestNote: orNull(values.interestNote),
            litterId: orNull(values.litterId),
            dogId: orNull(values.dogId),
            followUpAt: orNull(values.followUpAt),
        },
    };
}

/** Form values for an existing lead (Edit lead). */
export function leadToFormValues(lead: Omit<LeadInput, "stage"> & { stage: string }): LeadFormValues {
    return {
        name: lead.name,
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        preferredContact: lead.preferredContact,
        city: lead.city ?? "",
        state: lead.state ?? "",
        source: lead.source,
        stage: lead.stage,
        interestBreed: lead.interestBreed,
        litterId: lead.litterId ?? "",
        dogId: lead.dogId ?? "",
        interestNote: lead.interestNote ?? "",
        followUpAt: lead.followUpAt ?? "",
    };
}

export const EMPTY_LEAD_VALUES: LeadFormValues = {
    name: "",
    email: "",
    phone: "",
    preferredContact: "WHATSAPP",
    city: "",
    state: "",
    source: "OTHER",
    stage: "NEW",
    interestBreed: "",
    litterId: "",
    dogId: "",
    interestNote: "",
    followUpAt: "",
};
