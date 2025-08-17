"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateOtherCCs = exports.buildEmployeeDoc = exports.nameCcId = exports.nameKey = exports.norm = void 0;
const norm = (s) => (s !== null && s !== void 0 ? s : "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/\s+/g, " ").trim().toLowerCase();
exports.norm = norm;
const nameKey = (firstName, lastName) => `${(0, exports.norm)(lastName)}|${(0, exports.norm)(firstName)}`;
exports.nameKey = nameKey;
const nameCcId = (firstName, lastName, cc) => `${(0, exports.nameKey)(firstName, lastName)}|${(0, exports.norm)(cc)}`; // -> Firestore Doc-ID (kein "/" enthalten)
exports.nameCcId = nameCcId;
const buildEmployeeDoc = (core) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    return ({
        firstName: (_b = (_a = core.firstName) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "",
        lastName: (_d = (_c = core.lastName) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "",
        normalizedName: (0, exports.nameKey)(core.firstName, core.lastName),
        competenceCenter: (_f = (_e = core.competenceCenter) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : "", // Behalte Original-Formatierung
        businessLine: (_h = (_g = core.businessLine) === null || _g === void 0 ? void 0 : _g.trim()) !== null && _h !== void 0 ? _h : "", // Behalte Original-Formatierung
        businessUnit: (_k = (_j = core.businessUnit) === null || _j === void 0 ? void 0 : _j.trim()) !== null && _k !== void 0 ? _k : "", // Behalte Original-Formatierung
        bereich: (_m = (_l = core.bereich) === null || _l === void 0 ? void 0 : _l.trim()) !== null && _m !== void 0 ? _m : "", // Behalte Original-Formatierung
        teamName: (_p = (_o = core.teamName) === null || _o === void 0 ? void 0 : _o.trim()) !== null && _p !== void 0 ? _p : "", // Behalte Original-Formatierung
        grade: (_r = (_q = core.grade) === null || _q === void 0 ? void 0 : _q.trim()) !== null && _r !== void 0 ? _r : "", // Behalte Original-Formatierung
        company: (_s = core.company) !== null && _s !== void 0 ? _s : null,
        location: (_t = core.location) !== null && _t !== void 0 ? _t : null,
        email: core.email ? core.email.trim().toLowerCase() : null,
        profileUrl: (_v = (_u = core.profileUrl) === null || _u === void 0 ? void 0 : _u.trim()) !== null && _v !== void 0 ? _v : null,
        active: true,
        updatedAt: null, // Wird später mit FieldValue.serverTimestamp() ersetzt
    });
};
exports.buildEmployeeDoc = buildEmployeeDoc;
// Optional: Bei CC-Wechsel ältere Datensätze (gleicher normalizedName, anderes CC) deaktivieren:
const deactivateOtherCCs = async (db, nk, keepId) => {
    const snap = await db.collection("employees").where("normalizedName", "==", nk).get();
    const batch = db.batch();
    snap.docs.forEach((d) => {
        if (d.id !== keepId)
            batch.update(d.ref, { active: false });
    });
    await batch.commit();
};
exports.deactivateOtherCCs = deactivateOtherCCs;
//# sourceMappingURL=identity.js.map