// Translation check. Run: node scripts/check-messages.mjs
// Reports keys missing in either locale, pt-BR values identical to English
// (often fine: names, codes, "Status"; check them by eye) and keys no code
// seems to use. "Unused" resolves keys against the namespaces passed to
// useTranslations/getTranslations and counts dynamic keys (`status.${x}`)
// as used, so confirm with a grep before deleting anything.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const flat = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
const en = new Map(flat(JSON.parse(readFileSync("messages/en.json", "utf8"))));
const pt = new Map(flat(JSON.parse(readFileSync("messages/pt-BR.json", "utf8"))));

const onlyEn = [...en.keys()].filter((k) => !pt.has(k));
const onlyPt = [...pt.keys()].filter((k) => !en.has(k));
const same = [...en.entries()].filter(([k, v]) => pt.get(k) === v && /[a-z]{3,}/i.test(String(v).replace(/\{[^}]*\}/g, "")));

const files = [];
const walk = (dir) => {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name)) files.push(readFileSync(path, "utf8"));
    }
};
["app", "components", "lib", "i18n"].forEach(walk);
const code = files.join("\n");
const namespaces = new Set([...code.matchAll(/(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?["'`]([\w.-]+)["'`]/g)].map((m) => m[1]));
namespaces.add("");
const strings = new Set([...code.matchAll(/["'`]([\w.${}-]+)["'`]/g)].map((m) => m[1]));
const templates = [...code.matchAll(/`([^`]*\$\{[^`]*)`/g)].map((m) => m[1]);
const used = (key) =>
    [...namespaces].some((ns) => {
        if (ns && !key.startsWith(ns + ".")) return false;
        const rest = ns ? key.slice(ns.length + 1) : key;
        if (strings.has(rest)) return true;
        if (templates.some((t) => { const pre = t.split("${")[0]; return pre && rest.startsWith(pre) && /^[\w.-]*\.?$/.test(pre); })) return true;
        const last = rest.split(".").pop();
        const parent = rest.slice(0, rest.length - last.length);
        return Boolean(parent) && strings.has(last) && templates.some((t) => t.includes(parent + "${"));
    });
const unused = [...en.keys()].filter((k) => !used(k));

const report = (label, list) => console.log(`${label} (${list.length})${list.length ? ":\n  " + list.join("\n  ") : ""}`);
report("missing in pt-BR", onlyEn);
report("missing in en", onlyPt);
report("identical in pt-BR", same.map(([k, v]) => `${k} = ${JSON.stringify(v)}`));
report("possibly unused", unused);
process.exitCode = onlyEn.length || onlyPt.length ? 1 : 0;
