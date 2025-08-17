

export const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .replace(/\s+/g," ").trim().toLowerCase();

export const nameKey = (firstName: string, lastName: string) =>
  `${norm(lastName)}|${norm(firstName)}`;

export const nameCcId = (firstName: string, lastName: string, cc: string) =>
  `${nameKey(firstName,lastName)}|${norm(cc)}`;  // -> Firestore Doc-ID (kein "/" enthalten)

export type EmployeeCore = {
  firstName: string; 
  lastName: string; 
  competenceCenter: string;
  businessLine?: string; 
  businessUnit?: string; 
  bereich?: string;
  teamName?: string; 
  grade?: string;
  company?: string; 
  location?: string; 
  email?: string | null;
  profileUrl?: string;
};

export const buildEmployeeDoc = (core: EmployeeCore) => ({
  firstName: core.firstName?.trim() ?? "",
  lastName:  core.lastName?.trim() ?? "",
  normalizedName: nameKey(core.firstName, core.lastName),
  competenceCenter: core.competenceCenter?.trim() ?? "", // Behalte Original-Formatierung
  businessLine: core.businessLine?.trim() ?? "", // Behalte Original-Formatierung
  businessUnit: core.businessUnit?.trim() ?? "", // Behalte Original-Formatierung
  bereich: core.bereich?.trim() ?? "", // Behalte Original-Formatierung
  teamName: core.teamName?.trim() ?? "", // Behalte Original-Formatierung
  grade: core.grade?.trim() ?? "", // Behalte Original-Formatierung
  company: core.company ?? null,
  location: core.location ?? null,
  email: core.email ? core.email.trim().toLowerCase() : null,
  profileUrl: core.profileUrl?.trim() ?? null,
  active: true,
  updatedAt: null, // Wird später mit FieldValue.serverTimestamp() ersetzt
});

// Optional: Bei CC-Wechsel ältere Datensätze (gleicher normalizedName, anderes CC) deaktivieren:
export const deactivateOtherCCs = async (db: any, nk: string, keepId: string) => {
  const snap = await db.collection("employees").where("normalizedName","==", nk).get();
  const batch = db.batch();
  snap.docs.forEach((d: any) => {
    if (d.id !== keepId) batch.update(d.ref, { active: false });
  });
  await batch.commit();
};
