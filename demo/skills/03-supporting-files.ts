/**
 * Demo 03: Skill with Supporting Files
 * 
 * This demo shows how Claude Code Skills can include supporting files
 * in their directory, and how these files are made available to the LLM
 * when the skill is invoked.
 * 
 * Supporting files can include templates, examples, configuration files,
 * or any other resources the skill needs.
 */

import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"

const DEMO_DIR = join(process.cwd(), "temp-skill-demo-03")
const CLAUDE_DIR = join(DEMO_DIR, ".claude")
const SKILL_DIR = join(CLAUDE_DIR, "skills", "api-generator")

console.log("🎬 Demo 03: Skill with Supporting Files\n")
console.log("=" .repeat(70))
console.log()

// ============================================================================
// Step 1: Create a skill with supporting files
// ============================================================================

console.log("📝 Step 1: Creating Skill with Supporting Files")
console.log("-".repeat(70))

await mkdir(join(SKILL_DIR, "templates"), { recursive: true })
await mkdir(join(SKILL_DIR, "examples"), { recursive: true })

// Main skill file
const skillContent = `---
name: api-generator
description: Generates REST API endpoints following best practices
allowed-tools: Read, Write, Edit
---

# API Generator Skill

## Purpose
Generate well-structured REST API endpoints with proper error handling,
validation, and documentation.

## Instructions

When generating an API endpoint, follow these steps:

1. **Read the templates**: Check the supporting files in this skill directory
   - templates/controller.ts - Controller template
   - templates/route.ts - Route definition template
   - templates/validation.ts - Request validation template
   - examples/sample-api.ts - Complete example

2. **Understand requirements**: Ask the user about:
   - Resource name (e.g., "user", "product")
   - Endpoints needed (GET, POST, PUT, DELETE)
   - Required fields and validation rules
   - Authentication requirements

3. **Generate the code**: Use the templates to create:
   - Controller file with business logic
   - Route file with endpoint definitions
   - Validation schemas for request bodies
   - Tests for the endpoints

4. **Follow best practices**:
   - Consistent error handling
   - Input validation
   - Proper status codes
   - JSDoc comments
   - TypeScript types

## Template Usage

The templates use placeholder variables:
- {{RESOURCE_NAME}} - Name of the resource (singular)
- {{RESOURCE_NAME_PLURAL}} - Plural form
- {{FIELDS}} - Field definitions
- {{VALIDATIONS}} - Validation rules

Replace these with actual values when generating code.
`

await writeFile(join(SKILL_DIR, "SKILL.md"), skillContent, "utf-8")
console.log("✅ Created SKILL.md")

// Controller template
const controllerTemplate = `import { Request, Response } from 'express'
import { {{RESOURCE_NAME}}Service } from '../services/{{RESOURCE_NAME}}.service'

/**
 * {{RESOURCE_NAME}} Controller
 * Handles HTTP requests for {{RESOURCE_NAME}} resources
 */
export class {{RESOURCE_NAME}}Controller {
  /**
   * Get all {{RESOURCE_NAME_PLURAL}}
   */
  async getAll(req: Request, res: Response) {
    try {
      const {{RESOURCE_NAME_PLURAL}} = await {{RESOURCE_NAME}}Service.findAll()
      res.json({{RESOURCE_NAME_PLURAL}})
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch {{RESOURCE_NAME_PLURAL}}' })
    }
  }

  /**
   * Get {{RESOURCE_NAME}} by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const {{RESOURCE_NAME}} = await {{RESOURCE_NAME}}Service.findById(id)
      
      if (!{{RESOURCE_NAME}}) {
        return res.status(404).json({ error: '{{RESOURCE_NAME}} not found' })
      }
      
      res.json({{RESOURCE_NAME}})
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch {{RESOURCE_NAME}}' })
    }
  }

  /**
   * Create new {{RESOURCE_NAME}}
   */
  async create(req: Request, res: Response) {
    try {
      const {{RESOURCE_NAME}}Data = req.body
      const new{{RESOURCE_NAME}} = await {{RESOURCE_NAME}}Service.create({{RESOURCE_NAME}}Data)
      res.status(201).json(new{{RESOURCE_NAME}})
    } catch (error) {
      res.status(400).json({ error: 'Failed to create {{RESOURCE_NAME}}' })
    }
  }

  /**
   * Update {{RESOURCE_NAME}} by ID
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const {{RESOURCE_NAME}}Data = req.body
      const updated{{RESOURCE_NAME}} = await {{RESOURCE_NAME}}Service.update(id, {{RESOURCE_NAME}}Data)
      
      if (!updated{{RESOURCE_NAME}}) {
        return res.status(404).json({ error: '{{RESOURCE_NAME}} not found' })
      }
      
      res.json(updated{{RESOURCE_NAME}})
    } catch (error) {
      res.status(400).json({ error: 'Failed to update {{RESOURCE_NAME}}' })
    }
  }

  /**
   * Delete {{RESOURCE_NAME}} by ID
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await {{RESOURCE_NAME}}Service.delete(id)
      res.status(204).send()
    } catch (error) {
      res.status(404).json({ error: '{{RESOURCE_NAME}} not found' })
    }
  }
}
`

await writeFile(join(SKILL_DIR, "templates", "controller.ts"), controllerTemplate, "utf-8")
console.log("✅ Created templates/controller.ts")

// Route template
const routeTemplate = `import { Router } from 'express'
import { {{RESOURCE_NAME}}Controller } from '../controllers/{{RESOURCE_NAME}}.controller'
import { validate{{RESOURCE_NAME}} } from '../middleware/validation'

const router = Router()
const controller = new {{RESOURCE_NAME}}Controller()

/**
 * {{RESOURCE_NAME}} Routes
 */

// GET /{{RESOURCE_NAME_PLURAL}} - Get all {{RESOURCE_NAME_PLURAL}}
router.get('/{{RESOURCE_NAME_PLURAL}}', controller.getAll)

// GET /{{RESOURCE_NAME_PLURAL}}/:id - Get {{RESOURCE_NAME}} by ID
router.get('/{{RESOURCE_NAME_PLURAL}}/:id', controller.getById)

// POST /{{RESOURCE_NAME_PLURAL}} - Create new {{RESOURCE_NAME}}
router.post('/{{RESOURCE_NAME_PLURAL}}', validate{{RESOURCE_NAME}}, controller.create)

// PUT /{{RESOURCE_NAME_PLURAL}}/:id - Update {{RESOURCE_NAME}}
router.put('/{{RESOURCE_NAME_PLURAL}}/:id', validate{{RESOURCE_NAME}}, controller.update)

// DELETE /{{RESOURCE_NAME_PLURAL}}/:id - Delete {{RESOURCE_NAME}}
router.delete('/{{RESOURCE_NAME_PLURAL}}/:id', controller.delete)

export default router
`

await writeFile(join(SKILL_DIR, "templates", "route.ts"), routeTemplate, "utf-8")
console.log("✅ Created templates/route.ts")

// Example file
const exampleContent = `// Example: User API
// This shows how a complete API endpoint looks after generation

import { Router } from 'express'
import { UserController } from '../controllers/user.controller'
import { validateUser } from '../middleware/validation'

const router = Router()
const controller = new UserController()

router.get('/users', controller.getAll)
router.get('/users/:id', controller.getById)
router.post('/users', validateUser, controller.create)
router.put('/users/:id', validateUser, controller.update)
router.delete('/users/:id', controller.delete)

export default router
`

await writeFile(join(SKILL_DIR, "examples", "sample-api.ts"), exampleContent, "utf-8")
console.log("✅ Created examples/sample-api.ts")
console.log()

// ============================================================================
// Step 2: Show how supporting files are discovered
// ============================================================================

console.log("🔍 Step 2: Supporting Files Discovery")
console.log("-".repeat(70))

console.log("Skill directory structure:")
console.log("  .claude/skills/api-generator/")
console.log("  ├── SKILL.md                    (main skill file)")
console.log("  ├── templates/")
console.log("  │   ├── controller.ts           (supporting file)")
console.log("  │   ├── route.ts                (supporting file)")
console.log("  │   └── validation.ts           (supporting file)")
console.log("  └── examples/")
console.log("      └── sample-api.ts           (supporting file)")
console.log()

console.log("When crosstrain loads this skill:")
console.log("  1. Finds SKILL.md as the main definition")
console.log("  2. Scans directory for additional files")
console.log("  3. Recursively includes files from subdirectories")
console.log("  4. Lists all supporting files in tool output")
console.log()

// ============================================================================
// Step 3: Show tool invocation output
// ============================================================================

console.log("🚀 Step 3: Tool Invocation Output")
console.log("-".repeat(70))

console.log("When the LLM invokes skill_api_generator, it receives:")
console.log()
console.log("```markdown")
console.log("## Skill: api-generator")
console.log()
console.log("### Instructions")
console.log("[... skill instructions ...]")
console.log()
console.log("### Supporting Files Available")
console.log()
console.log("- templates/controller.ts")
console.log("- templates/route.ts")
console.log("- templates/validation.ts")
console.log("- examples/sample-api.ts")
console.log()
console.log("Use the read tool to access these files if needed.")
console.log("```")
console.log()

// ============================================================================
// Step 4: Usage workflow
// ============================================================================

console.log("💡 Step 4: Usage Workflow")
console.log("-".repeat(70))

console.log("Example conversation:")
console.log()
console.log("User: 'Generate a REST API for products'")
console.log()
console.log("LLM workflow:")
console.log("  1. Invokes skill_api_generator")
console.log("  2. Receives skill instructions and supporting file list")
console.log("  3. Uses Read tool to load template files:")
console.log("     read('.claude/skills/api-generator/templates/controller.ts')")
console.log("  4. Replaces placeholders with 'product' values")
console.log("  5. Creates controller, routes, and validation files")
console.log("  6. Uses the example for reference")
console.log()

// ============================================================================
// Step 5: Benefits of supporting files
// ============================================================================

console.log("✨ Step 5: Benefits of Supporting Files")
console.log("-".repeat(70))

console.log("Why use supporting files?")
console.log()
console.log("1. **Reusable Templates**")
console.log("   - Don't embed large templates in SKILL.md")
console.log("   - Keep templates maintainable and editable")
console.log()
console.log("2. **Concrete Examples**")
console.log("   - Show complete, working examples")
console.log("   - Help LLM understand desired output")
console.log()
console.log("3. **Configuration Files**")
console.log("   - Include schema definitions, configs")
console.log("   - Reference standards and conventions")
console.log()
console.log("4. **Better Organization**")
console.log("   - Separate concerns logically")
console.log("   - Easier to update individual pieces")
console.log()
console.log("5. **Version Control Friendly**")
console.log("   - Track changes to templates separately")
console.log("   - Review updates more easily")
console.log()

// ============================================================================
// Step 6: Best practices
// ============================================================================

console.log("📋 Step 6: Best Practices")
console.log("-".repeat(70))

console.log("When creating skills with supporting files:")
console.log()
console.log("1. **Use clear file names**")
console.log("   controller-template.ts vs ctrl_tmpl.ts")
console.log()
console.log("2. **Organize in subdirectories**")
console.log("   templates/, examples/, schemas/")
console.log()
console.log("3. **Document placeholders**")
console.log("   Use consistent {{PLACEHOLDER}} format")
console.log("   List all placeholders in SKILL.md")
console.log()
console.log("4. **Include complete examples**")
console.log("   Show fully-realized output")
console.log("   Demonstrate best practices")
console.log()
console.log("5. **Keep templates focused**")
console.log("   One template per file type")
console.log("   Avoid overly complex templates")
console.log()

// ============================================================================
// Step 7: File types that work well
// ============================================================================

console.log("📁 Step 7: Common Supporting File Types")
console.log("-".repeat(70))

console.log("Good candidates for supporting files:")
console.log()
console.log("• **Templates**: Code templates with placeholders")
console.log("• **Examples**: Complete, working examples")
console.log("• **Schemas**: JSON schemas, data models")
console.log("• **Configs**: Configuration file templates")
console.log("• **Documentation**: Additional instructions, guides")
console.log("• **Test Templates**: Test file templates")
console.log("• **Style Guides**: Coding conventions, patterns")
console.log()

// ============================================================================
// Cleanup
// ============================================================================

console.log("🧹 Cleanup")
console.log("-".repeat(70))
await rm(DEMO_DIR, { recursive: true, force: true })
console.log("✅ Temporary files removed")
console.log()

// ============================================================================
// Summary
// ============================================================================

console.log("=" .repeat(70))
console.log("📊 Summary")
console.log("=" .repeat(70))
console.log()
console.log("Skill Structure:")
console.log("  📁 SKILL.md - Main skill definition")
console.log("  📁 templates/ - Reusable code templates")
console.log("  📁 examples/ - Complete working examples")
console.log("  📁 *.* - Any additional supporting files")
console.log()
console.log("Discovery:")
console.log("  • Crosstrain recursively scans skill directory")
console.log("  • All files except SKILL.md are supporting files")
console.log("  • Files in subdirectories are included")
console.log()
console.log("Usage:")
console.log("  • Supporting files listed in tool output")
console.log("  • LLM uses Read tool to load file contents")
console.log("  • Templates can include placeholders")
console.log("  • Examples guide desired output")
console.log()
console.log("Benefits:")
console.log("  ✅ Keep templates maintainable")
console.log("  ✅ Provide concrete examples")
console.log("  ✅ Better organization")
console.log("  ✅ Easier version control")
console.log()
console.log("✅ Demo Complete!")
console.log()

/**
 * Key Takeaways:
 * 
 * 1. Skills can include any number of supporting files
 * 2. Files are discovered recursively in skill directory
 * 3. Supporting files are listed in tool output
 * 4. LLM uses Read tool to access file contents
 * 5. Templates, examples, and configs work well as supporting files
 * 
 * Next Steps:
 * - Try creating your own skill with templates
 * - Use supporting files for code generation tasks
 * - See ../agents/ for agent examples
 */
