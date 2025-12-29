const job = process.env.JOB;

function stamp() {
  return new Date().toISOString();
}

if (!job) {
  console.error(`[worker] Missing JOB env var`);
  process.exit(1);
}

if (job === "jobA") {
  console.log(`[jobA] tick @ ${stamp()} (every 1 minute)`);
  process.exit(0);
}

if (job === "jobB") {
  console.log(`[jobB] tick @ ${stamp()} (every 30 seconds)`);
  process.exit(0);
}

console.error(`[worker] Unknown JOB="${job}"`);
process.exit(1);
