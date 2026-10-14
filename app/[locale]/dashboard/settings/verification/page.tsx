import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Check, Circle, Clock, FileImage, X, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getVerification } from "@/lib/dashboard/verification";
import { getViewerTimeZone } from "@/lib/dashboard/viewerDate";
import type { VerificationStatus } from "@/lib/dashboard/types";
import { submitVerificationAction } from "./actions";
import Badge, { type BadgeTone } from "@/components/dashboard/ui/Badge";
import Card from "@/components/dashboard/ui/Card";
import Notice from "@/components/dashboard/ui/Notice";
import VerificationForm from "@/components/dashboard/settings/VerificationForm";
import WithdrawVerification from "@/components/dashboard/settings/WithdrawVerification";
import { documentName } from "@/components/dashboard/settings/documentName";

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

const STATUS_TONE: Record<VerificationStatus, BadgeTone> = { NOT_SUBMITTED: "neutral", PENDING: "amber", APPROVED: "green", REJECTED: "red" };

type StepState = "done" | "current" | "rejected" | "todo";
const STEP_LOOK: Record<StepState, { box: string; title: string; icon: LucideIcon }> = {
    done: { box: "border-status-green-solid/40", title: "text-status-green", icon: Check },
    current: { box: "border-status-amber-solid/50", title: "text-status-amber", icon: Clock },
    rejected: { box: "border-status-red-strong/40", title: "text-status-red", icon: X },
    todo: { box: "border-line", title: "text-stone-500", icon: Circle },
};

/** Changing the CNPJ/CPF happens on the Kennel profile tab, in its Registration section. */
const KENNEL_PROFILE_HREF = "/dashboard/settings#registration";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.settings");
    return { title: `${t("tabs.verification")} · ${t("title")}` };
}

/**
 * Status badge + three-step strip, registration (masked), then by status:
 * NOT_SUBMITTED / REJECTED → the editable form (Submit / Resubmit),
 * PENDING → read-only summary + Withdraw, APPROVED → read-only summary.
 * In development, `?state=` and `?registration=` preview every state (see verification.ts).
 */
export default async function VerificationSettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const raw = await searchParams;
    const [view, t, format, timeZone] = await Promise.all([
        // DEV-ONLY testing aid: the data function ignores these in production builds.
        getVerification(kennel.id, { state: one(raw.state), registration: one(raw.registration) }),
        getTranslations("dashboard.settings.verification"),
        getFormatter(),
        getViewerTimeZone(),
    ]);
    const { request, registration } = view;
    const date = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric", timeZone }) : "");
    const notice = one(raw.notice);

    const steps: { key: string; title: string; detail: string; state: StepState }[] = [
        {
            key: "submitted",
            title: t("steps.submitted"),
            detail: request.submittedAt ? date(request.submittedAt) : t("steps.notYet"),
            state: request.status === "NOT_SUBMITTED" ? "todo" : "done",
        },
        {
            key: "review",
            title: t("steps.inReview"),
            detail: request.status === "PENDING" ? t("steps.reviewTime") : request.status === "NOT_SUBMITTED" ? t("steps.reviewTime") : t("steps.reviewDone"),
            state: request.status === "PENDING" ? "current" : request.status === "NOT_SUBMITTED" ? "todo" : "done",
        },
        {
            key: "decision",
            title: t("steps.decision"),
            detail:
                request.status === "APPROVED"
                    ? t("steps.approvedOn", { date: date(request.decidedAt) })
                    : request.status === "REJECTED"
                      ? t("steps.rejectedOn", { date: date(request.decidedAt) })
                      : t("steps.decisionHint"),
            state: request.status === "APPROVED" ? "done" : request.status === "REJECTED" ? "rejected" : "todo",
        },
    ];
    const editable = request.status === "NOT_SUBMITTED" || request.status === "REJECTED";

    return (
        <div className="flex flex-col gap-6">
            {notice === "submitted" && (
                <Notice tone="success" clearParam="notice">
                    {t("notices.submitted")}
                </Notice>
            )}
            {notice === "withdrawn" && (
                <Notice tone="info" clearParam="notice">
                    {t("notices.withdrawn")}
                </Notice>
            )}

            <Card as="section" aria-labelledby="verification-heading">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 id="verification-heading" className="mb-1 font-display text-xl font-bold">
                            {t("heading")}
                        </h2>
                        <p className="text-[13px] text-stone-500">{t("sub")}</p>
                    </div>
                    <Badge tone={STATUS_TONE[request.status]}>
                        <span className="sr-only">{t("statusLabel")} </span>
                        {t(`status.${request.status}`)}
                    </Badge>
                </div>

                <ol aria-label={t("steps.label")} className="my-5.5 flex flex-wrap gap-3">
                    {steps.map((step) => {
                        const look = STEP_LOOK[step.state];
                        const Icon = look.icon;
                        return (
                            <li key={step.key} className={`flex-[1_1_180px] rounded-xl border bg-white p-3.5 ${look.box}`}>
                                <p className={`flex items-center gap-1.5 text-xs font-semibold ${look.title}`}>
                                    <Icon className="size-3.5" aria-hidden strokeWidth={2.5} />
                                    {step.title}
                                    <span className="sr-only"> ({t(`steps.state.${step.state}`)})</span>
                                </p>
                                <p className="mt-1 text-[13px] text-stone-600">{step.detail}</p>
                            </li>
                        );
                    })}
                </ol>

                {request.status === "REJECTED" && (
                    <Notice tone="error" dismissible={false} className="mb-5">
                        <p className="font-semibold">{t("rejectedTitle")}</p>
                        {request.reviewerNote && (
                            <p className="mt-1 font-normal">
                                <span className="font-medium">{t("reviewerNote")}</span> {request.reviewerNote}
                            </p>
                        )}
                        <p className="mt-1 font-normal">{t("rejectedHelp")}</p>
                    </Notice>
                )}
                {request.status === "APPROVED" && (
                    <Notice tone="success" dismissible={false} className="mb-5">
                        <p className="font-semibold">{t("approvedTitle")}</p>
                        <p className="mt-1 font-normal">{t("approvedBody", { date: date(request.decidedAt) })}</p>
                    </Notice>
                )}

                {registration ? (
                    <div className="max-w-sm">
                        <p className="mb-1.5 text-[13px] font-semibold text-stone-700">{t("registeredAs")}</p>
                        <p className="rounded-xl border border-line bg-stone-50 px-3.5 py-2.75 text-sm text-stone-900">
                            {t(`registrationTypes.${registration.type}`)} {registration.maskedNumber}
                        </p>
                        {editable && (
                            <Link href={KENNEL_PROFILE_HREF} className="mt-1.5 inline-block rounded text-xs font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                                {t("changeRegistration")}
                            </Link>
                        )}
                    </div>
                ) : (
                    <Notice tone="warning" dismissible={false}>
                        <p className="font-semibold">{t("missingTitle")}</p>
                        <p className="mt-1 font-normal">
                            {t("missing")}{" "}
                            <Link href={KENNEL_PROFILE_HREF} className="font-semibold underline">
                                {t("goToProfile")}
                            </Link>
                        </p>
                    </Notice>
                )}

                {editable ? (
                    <>
                        <VerificationForm
                            action={submitVerificationAction}
                            initialValues={{ cbkcRegistration: request.cbkcRegistration ?? view.cbkcOnFile ?? "", documentUrls: request.documentUrls }}
                            canSubmit={!view.registrationMissing}
                            resubmit={request.status === "REJECTED"}
                        />
                        {request.status === "NOT_SUBMITTED" && (
                            <p className="mt-5 rounded-xl border border-line p-3.5 text-[13px] text-stone-600">
                                {t.rich("ifRejected", { strong: (chunks) => <strong className="font-semibold text-stone-900">{chunks}</strong> })}
                            </p>
                        )}
                    </>
                ) : (
                    <dl className="mt-5 grid gap-4.5 sm:grid-cols-2">
                        <div>
                            <dt className="mb-1.5 text-[13px] font-semibold text-stone-700">{t("cbkc")}</dt>
                            <dd className="text-sm text-stone-900">{request.cbkcRegistration ?? t("none")}</dd>
                        </div>
                        <div>
                            <dt className="mb-1.5 text-[13px] font-semibold text-stone-700">{t("documents")}</dt>
                            <dd>
                                <ul className="flex flex-col gap-1.5">
                                    {request.documentUrls.map((url) => (
                                        <li key={url} className="flex items-center gap-2 text-sm text-stone-900">
                                            <FileImage className="size-4 shrink-0 text-stone-500" aria-hidden />
                                            <span className="min-w-0 truncate">{documentName(url)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </div>
                    </dl>
                )}

                {request.status === "PENDING" && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                        <p className="text-[13px] text-stone-600">{t("pendingSummary", { date: date(request.submittedAt) })}</p>
                        <WithdrawVerification />
                    </div>
                )}
            </Card>
        </div>
    );
}
