/**
 * check-oracle — OpenCode custom tool
 * Checks Oracle VM status: PM2 process list + last deploy log lines.
 * Usage: The LLM calls this tool when it needs to know if the server is running.
 */
import { tool } from "opencode/tool";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const SSH_CMD = "ssh -i ~/Downloads/oracle.key -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@84.235.239.6";

export default tool({
  description:
    "Check the Oracle VM status for SinaiCamps: PM2 process list and last 15 lines of deploy.log. Use this to verify the app is running after a deploy or when debugging production issues.",
  args: z.object({
    lines: z
      .number()
      .optional()
      .default(15)
      .describe("Number of deploy.log lines to return (default 15)"),
  }),
  execute: async ({ lines }) => {
    try {
      const { stdout, stderr } = await execAsync(
        `${SSH_CMD} "pm2 list && echo '---DEPLOY LOG---' && tail -${lines} ~/deploy.log"`,
        { timeout: 20000 }
      );
      return stdout || stderr || "No output received";
    } catch (err: any) {
      if (err.code === "ETIMEDOUT" || err.message?.includes("timed out")) {
        return "❌ Connection timed out. Oracle VM may be unreachable. Check your VPN or network.";
      }
      return `❌ SSH Error: ${err.message}`;
    }
  },
});
