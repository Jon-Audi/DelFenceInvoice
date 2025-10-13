/**
 * One-time backfill for customers.searchIndex
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   npm run backfill
 */
import admin from "firebase-admin";

type Customer = {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  searchIndex?: string | null;
};

const buildSearchIndex = (c: Customer) =>
  [
    c.companyName ?? "",
    c.firstName ?? "",
    c.lastName ?? "",
    c.email ?? "",
    c.phone ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim() || null;

async function main() {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  const db = admin.firestore();
  const snap = await db.collection("customers").get();

  let updated = 0;
  const batch = db.batch();
  snap.forEach((docSnap) => {
    const c = docSnap.data() as Customer;
    const idx = buildSearchIndex(c);
    if (idx !== (c.searchIndex ?? null)) {
      batch.update(docSnap.ref, { searchIndex: idx });
      updated++;
    }
  });

  if (updated > 0) {
    await batch.commit();
  }
  console.log(`Backfill complete. Updated ${updated} customers.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
