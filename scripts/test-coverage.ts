#!/usr/bin/env bun
/**
 * Coverage Report Generator
 *
 * Runs tests with coverage and generates a detailed report.
 */

import { $ } from "bun"
import { existsSync, mkdirSync } from "fs"
import { join } from "path"

const coverageDir = join(process.cwd(), "coverage")

console.log("\n╔════════════════════════════════════════╗")
console.log("║      Crosstrain Coverage Report        ║")
console.log("╚════════════════════════════════════════╝\n")

// Ensure coverage directory exists
if (!existsSync(coverageDir)) {
  mkdirSync(coverageDir, { recursive: true })
}

// Run tests with coverage
try {
  console.log("Running tests with coverage...\n")

  const result = await $`bun test --coverage`.nothrow()

  console.log("\n────────────────────────────────────────")

  if (result.exitCode === 0) {
    console.log("✅ Coverage report generated!")
    console.log(`\nReport available at: ${coverageDir}`)
  } else {
    console.log("❌ Tests failed - coverage may be incomplete")
    process.exit(result.exitCode)
  }
} catch (error) {
  console.error("Error generating coverage:", error)
  process.exit(1)
}
