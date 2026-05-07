// JSON Schema validation via ajv. Schemas live in schemas/*.json and are
// referenced by filename — the schema files are the contract documentation.
import { expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

const SCHEMAS_DIR = path.resolve(__dirname, '..', 'schemas');

// `strict: false` tolerates the `$schema` keyword and other draft-07 metadata
// without warnings. `allErrors: true` collects every violation in one pass so
// failures show all the issues, not just the first.
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

// Register every schema file under its filename — `$ref: "booking.json"`
// resolves to that registered schema. Loaded once at module init.
fs.readdirSync(SCHEMAS_DIR)
  .filter((f) => f.endsWith('.json'))
  .forEach((f) => {
    const schema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf8'));
    ajv.addSchema(schema, f);
  });

// Asserts that `data` matches the named JSON Schema file. Uses Playwright's
// `expect` so failures land in the report alongside the rest of the test's
// assertions, with each violation listed.
export function assertMatchesSchema(data: unknown, schemaFile: string): void {
  const validator = ajv.getSchema(schemaFile);
  if (!validator) {
    throw new Error(`Schema not found in schemas/: ${schemaFile}`);
  }
  const valid = validator(data);
//  if (!valid) {
    const errors = (validator.errors || [])
      .map((e) => `  ${e.instancePath || '/'} ${e.message}`)
      .join('\n');
    //expect(valid, `Schema validation failed (${schemaFile}):\n${errors}`).toBe(true);
    expect(valid, `Schema validation (${schemaFile})${valid ? ' passed' : ` failed:\n${errors}`}`).toBe(true);
 // }
}
