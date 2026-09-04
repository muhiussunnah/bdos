/**
 * Tiny dependency-free CSV/TSV parser + column mapper used by the lead
 * importer and the bulk sender. Handles quoted fields, embedded commas,
 * escaped quotes, CRLF line endings and auto-detects , ; | or tab delimiters.
 */

export type Row = Record<string, string>;

export const LEAD_FIELDS = [
  'company_name', 'contact_name', 'email', 'website', 'phone', 'role',
  'industry', 'location', 'linkedin_url', 'notes',
] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];

export const FIELD_LABELS: Record<LeadField, string> = {
  company_name: 'Company', contact_name: 'Contact name', email: 'Email', website: 'Website',
  phone: 'Phone', role: 'Role / title', industry: 'Industry', location: 'Location',
  linkedin_url: 'LinkedIn', notes: 'Notes',
};

/** Aliases (lower-cased, punctuation stripped) → canonical lead field. */
const ALIASES: Record<string, LeadField> = {
  company: 'company_name', companyname: 'company_name', organisation: 'company_name', organization: 'company_name',
  business: 'company_name', account: 'company_name', brand: 'company_name', firm: 'company_name',
  name: 'contact_name', contact: 'contact_name', contactname: 'contact_name', fullname: 'contact_name',
  person: 'contact_name', firstname: 'contact_name', first: 'contact_name', lead: 'contact_name',
  email: 'email', emailaddress: 'email', mail: 'email', emails: 'email', workemail: 'email',
  website: 'website', url: 'website', site: 'website', domain: 'website', web: 'website', homepage: 'website',
  phone: 'phone', phonenumber: 'phone', mobile: 'phone', tel: 'phone', telephone: 'phone', number: 'phone',
  role: 'role', title: 'role', jobtitle: 'role', position: 'role', designation: 'role',
  industry: 'industry', sector: 'industry', category: 'industry', niche: 'industry', vertical: 'industry',
  location: 'location', city: 'location', country: 'location', region: 'location', address: 'location', area: 'location',
  linkedin: 'linkedin_url', linkedinurl: 'linkedin_url', linkedinprofile: 'linkedin_url',
  notes: 'notes', note: 'notes', comment: 'notes', comments: 'notes', remarks: 'notes', description: 'notes',
};

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join('\n');
  const candidates = [',', ';', '\t', '|'];
  let best = ',', bestCount = 0;
  for (const c of candidates) {
    const count = head.split(c).length - 1;
    if (count > bestCount) { best = c; bestCount = count; }
  }
  return best;
}

/** Parse CSV text into a 2D array of strings. */
export function parseCSV(text: string, delimiter?: string): string[][] {
  const d = delimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === d) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

/** Guess which canonical lead field each header maps to (or null to skip). */
export function autoMap(headers: string[]): (LeadField | null)[] {
  const used = new Set<LeadField>();
  return headers.map((h) => {
    const key = normalizeHeader(h);
    let field: LeadField | null = ALIASES[key] ?? null;
    if (!field) {
      // fuzzy: header contains an alias word
      for (const [alias, f] of Object.entries(ALIASES)) {
        if (alias.length >= 4 && key.includes(alias)) { field = f; break; }
      }
    }
    if (field && used.has(field)) return null;
    if (field) used.add(field);
    return field;
  });
}

/** Turn parsed rows + a mapping into lead-shaped objects. */
export function rowsToLeads(rows: string[][], mapping: (LeadField | null)[], hasHeader: boolean): Row[] {
  const body = hasHeader ? rows.slice(1) : rows;
  return body.map((r) => {
    const obj: Row = {};
    mapping.forEach((field, i) => {
      if (!field) return;
      const v = (r[i] || '').trim();
      if (v) obj[field] = obj[field] ? `${obj[field]} ${v}` : v;
    });
    return obj;
  }).filter((o) => Object.keys(o).length > 0);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export function isEmail(v?: string | null) {
  return !!v && EMAIL_RE.test(v.trim());
}

/** Render {{placeholders}} in a template. Unknown keys become ''. */
export function renderTemplate(tpl: string, vars: Record<string, string | null | undefined>) {
  return tpl.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*(?:\|\s*([^}]*))?\}\}/g, (_m, key: string, fallback?: string) => {
    const v = vars[key];
    return (v && String(v).trim()) || (fallback ?? '').trim();
  });
}

/** Personalisation variables for one recipient. */
export function recipientVars(r: { email: string; name?: string | null; company?: string | null; role?: string | null; website?: string | null }) {
  const name = (r.name || '').trim();
  const first = name.split(/\s+/)[0] || '';
  const domain = r.email.split('@')[1] || '';
  return {
    email: r.email,
    name,
    first_name: first,
    company: (r.company || '').trim() || domain.replace(/\.[a-z]+$/i, ''),
    role: r.role || '',
    website: r.website || '',
    domain,
  };
}
