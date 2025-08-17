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
    var _a, _b, _c, _d, _e, _f;
    return ({
        firstName: (_b = (_a = core.firstName) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "",
        lastName: (_d = (_c = core.lastName) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "",
        normalizedName: (0, exports.nameKey)(core.firstName, core.lastName),
        competenceCenter: (0, exports.norm)(core.competenceCenter),
        businessLine: core.businessLine ? (0, exports.norm)(core.businessLine) : null,
        businessUnit: core.businessUnit ? (0, exports.norm)(core.businessUnit) : null,
        team: core.team ? (0, exports.norm)(core.team) : null,
        grade: core.grade ? (0, exports.norm)(core.grade) : null,
        company: (_e = core.company) !== null && _e !== void 0 ? _e : null,
        location: (_f = core.location) !== null && _f !== void 0 ? _f : null,
        email: core.email ? core.email.trim().toLowerCase() : null,
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