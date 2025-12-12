#!/usr/bin/env bun
/**
 * Test Runner Script
 *
 * Runs all tests with optional filtering and coverage reporting.
 *
 * Usage:
 *   bun run scripts/test.ts                    # Run all tests
 *   bun run scripts/test.ts --watch            # Run in watch mode
 *   bun run scripts/test.ts --coverage         # Run with coverage
 *   bun run scripts/test.ts --filter skills    # Run tests matching "skills"
 *   bun run scripts/test.ts --verbose          # Verbose output
 */

import { $ } from "bun"

const args = process.argv.slice(2)

// Parse arguments
const watch = args.includes("--watch") || args.includes("-w")
const coverage = args.includes("--coverage") || args.includes("-c")
const verbose = args.includes("--verbose") || args.includes("-v")

// Get filter pattern
const filterIndex = args.findIndex(a => a === "--filter" || a === "-f")
const filter = filterIndex !== -1 ? args[filterIndex + 1] : null

// Build command
const testArgs: string[] = ["test"]

if (watch) {
  testArgs.push("--watch")
}

if (coverage) {
  testArgs.push("--coverage")
}

if (filter) {
  testArgs.push("--test-name-pattern", filter)
}

if (verbose) {
  console.log("Running tests with args:", testArgs.join(" "))
}

// Print header
console.log("\n╔════════════════════════════════════════╗")
console.log("║        Crosstrain Test Runner          ║")
console.log("╚════════════════════════════════════════╝\n")

// Run tests
try {
  const result = await $`bun ${testArgs}`.nothrow()

  // Print summary
  console.log("\n────────────────────────────────────────")

  if (result.exitCode === 0) {
    console.log("✅ All tests passed!")
  } else {
    console.log("❌ Some tests failed")
    process.exit(result.exitCode)
  }
} catch (error) {
  console.error("Error running tests:", error)
  process.exit(1)
}
