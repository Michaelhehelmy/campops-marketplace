/**
 * run-tests — OpenCode custom tool
 * Runs the SinaiCamps test suite and returns a pass/fail summary.
 * Usage: The LLM calls this instead of raw bash when it needs test results.
 */
import { tool } from "opencode/tool";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default tool({
  description:
    "Run the SinaiCamps test suite (Vitest unit + integration tests) and return a summary of pass/fail counts and any failures. Use this before marking any task complete.",
  args: z.object({
    suite: z
      .enum(["unit", "e2e", "all"])
      .optional()
      .default("unit")
      .describe("Which suite to run: 'unit' (Vitest), 'e2e' (Playwright), or 'all'"),
    filter: z
      .string()
      .optional()
      .describe("Optional file path or test name filter"),
  }),
  execute: async ({ suite, filter }) => {
    const filterArg = filter ? ` ${filter}` : "";
    const commands: Record<string, string> = {
      unit: `npm run test -- --reporter=verbose${filterArg} 2>&1 | tail -50`,
      e2e: `npm run test:e2e${filterArg} 2>&1 | tail -80`,
      all: `npm run check 2>&1 | tail -100`,
    };

    try {
      const { stdout, stderr } = await execAsync(commands[suite], {
        cwd: process.cwd(),
        timeout: 300000, // 5 min max
      });
      return stdout || stderr || "No output";
    } catch (err: any) {
      // Tests failing returns non-zero exit — still return the output
      return err.stdout || err.stderr || `Error: ${err.message}`;
    }
  },
});
