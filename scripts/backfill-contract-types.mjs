#!/usr/bin/env node

import path from "path";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gitjobs.db");
const dryRun = process.argv.includes("--dry-run");
const runForAll = process.argv.includes("--all");

function inferContractType(text, sourceType) {
  const normalized = String(text || "").toLowerCase();

  if (/\bestagio\b|\bestágio\b|\binternship\b|\bintern\b/.test(normalized)) return "Internship";
  if (/\bpj\b|\bpessoa\s*juridica\b/.test(normalized)) return "PJ";
  if (/\bcontractor\b|\bindependent contractor\b|\b1099\b|\bc2c\b/.test(normalized)) return "PJ";
  if (/\bfreela\b|\bfreelance\b/.test(normalized)) return "Freela";
  if (/\bconsultant\b|\bconsultoria\b|\bpart[-\s]?time\b|\bpart time\b/.test(normalized)) return "Freela";
  if (/\bclt\b/.test(normalized)) return "CLT";

  const hasBrazilSignal =
    /\b(brasil|brazil|são paulo|sao paulo|rio de janeiro|curitiba|campinas|belo horizonte|porto alegre|recife|florianópolis|florianopolis|brasilia|brasília)\b/i.test(
      normalized
    ) ||
    /\b(vaga|requisitos|benef[ií]cios|sal[áa]rio|contrata[cç][aã]o|candidatar|remoto no brasil|h[ií]brido|presencial)\b/i.test(
      normalized
    );

  if (hasBrazilSignal) return "CLT";

  if (sourceType === "greenhouse_board" || sourceType === "lever_postings") {
    return "PJ";
  }

  if (/\bfull[-\s]?time\b|\btempo integral\b|\bpermanent\b|\bemployment\b/.test(normalized)) return "CLT";

  return "CLT";
}

function parseLabels(rawLabels) {
  if (!rawLabels) return [];
  try {
    const parsed = JSON.parse(rawLabels);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function main() {
  console.log(
    `${dryRun ? "Dry run:" : "Running:"} backfill contract_type on ${dbPath}...`
  );

  const sqlite = new Database(dbPath);
  const rows = sqlite
    .prepare(
      runForAll
        ? "SELECT id, source_type as sourceType, title, body, labels, location, contract_type as contractType FROM jobs"
        : "SELECT id, source_type as sourceType, title, body, labels, location, contract_type as contractType FROM jobs WHERE contract_type IS NULL OR trim(contract_type) = ''"
    )
    .all();

  if (!rows.length) {
    console.log(
      runForAll
        ? "No jobs found."
        : "No jobs with missing contract_type found."
    );
    return;
  }

  const inferred = rows
    .map((row) => {
    const labels = parseLabels(row.labels).join(" ");
    const text = `${row.title || ""}\n${row.body || ""}\n${row.location || ""}\n${labels}`;
    const inferredType = inferContractType(text, row.sourceType);
    if (!runForAll && String(row.contractType || "").trim()) {
      return null;
    }
    if (runForAll && row.contractType === inferredType) {
      return null;
    }
    return {
      id: row.id,
      contractType: inferredType,
    };
  })
    .filter(Boolean);

  if (!inferred.length) {
    console.log("No rows required updates.");
    return;
  }

  if (!dryRun) {
    const update = sqlite.prepare("UPDATE jobs SET contract_type = ? WHERE id = ?");
    const tx = sqlite.transaction((items) => {
      for (const item of items) {
        update.run(item.contractType, item.id);
      }
    });
    tx(inferred);
  }

  const byType = new Map();
  for (const row of inferred) {
    byType.set(row.contractType, (byType.get(row.contractType) || 0) + 1);
  }

  console.log(
    `${dryRun ? "Would update" : "Updated"} ${inferred.length} jobs${runForAll ? " (all mode)" : " with missing contract_type"}.`
  );
  for (const [type, count] of byType.entries()) {
    console.log(`  ${type}: ${count}`);
  }
}

main();
