import { readToken } from "@/lib/auth";

const DOCTOR_NAME_REGISTRY_KEY = "dr_decide_doctor_name_registry";
const PATIENT_NAME_REGISTRY_KEY = "dr_decide_patient_name_registry";

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof window !== "undefined" ? window.atob(payloadBase64) : "";
    if (!json) return null;
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAuthSubject(): string {
  if (typeof window === "undefined") return "";
  const payload = parseJwtPayload(readToken());
  return typeof payload?.sub === "string" ? payload.sub : "";
}

function readRegistry(storageKey: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const safe: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) safe[k] = v.trim();
    }
    return safe;
  } catch {
    return {};
  }
}

function writeRegistry(storageKey: string, data: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(data));
}

function upsertName(storageKey: string, id: string, name: string) {
  const safeId = id.trim();
  const safeName = name.trim();
  if (!safeId || !safeName || typeof window === "undefined") return;
  const current = readRegistry(storageKey);
  current[safeId] = safeName;
  writeRegistry(storageKey, current);
}

function findName(storageKey: string, id: string): string {
  const safeId = id.trim();
  if (!safeId) return "";
  const current = readRegistry(storageKey);
  return current[safeId] || "";
}

export function rememberDoctorName(doctorId: string, doctorName: string) {
  upsertName(DOCTOR_NAME_REGISTRY_KEY, doctorId, doctorName);
}

export function rememberPatientName(patientId: string, patientName: string) {
  upsertName(PATIENT_NAME_REGISTRY_KEY, patientId, patientName);
}

export function resolveDoctorName(doctorId: string): string {
  return findName(DOCTOR_NAME_REGISTRY_KEY, doctorId);
}

export function resolvePatientName(patientId: string): string {
  return findName(PATIENT_NAME_REGISTRY_KEY, patientId);
}
