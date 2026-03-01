import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { homedir } from "node:os";

const CLAUDE_DIR = resolve(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

export interface MemorySource {
  projectPath: string;
  fileName: string;
  content: string;
}

/**
 * Reads all Claude memory markdown files found under ~/.claude/projects.
 *
 * Memory files are stored at:
 *   ~/.claude/projects/{project-id}/memory/*.md
 *
 * Returns all found files with their content. Returns an empty array
 * if no memory files exist yet — this is normal for new users.
 */
export async function readAllClaudeMemories(): Promise<MemorySource[]> {
  const sources: MemorySource[] = [];

  let projectDirs: string[];
  try {
    projectDirs = await readdir(PROJECTS_DIR);
  } catch {
    // ~/.claude/projects doesn't exist — no memories at all
    return sources;
  }

  await Promise.all(
    projectDirs.map(async (projectDir) => {
      const memoryDir = join(PROJECTS_DIR, projectDir, "memory");
      let memoryFiles: string[];

      try {
        memoryFiles = (await readdir(memoryDir)).filter((f) => f.endsWith(".md"));
      } catch {
        // No memory directory for this project — skip
        return;
      }

      await Promise.all(
        memoryFiles.map(async (fileName) => {
          const filePath = join(memoryDir, fileName);
          try {
            const content = await readFile(filePath, "utf-8");
            if (content.trim()) {
              sources.push({ projectPath: projectDir, fileName, content });
            }
          } catch {
            // Unreadable file — skip
          }
        }),
      );
    }),
  );

  return sources;
}

/**
 * Concatenates memory sources into a single block for use in prompts.
 * Each source is labeled with its project path so the synthesizer has context.
 */
export function formatMemoriesForPrompt(sources: MemorySource[]): string {
  if (sources.length === 0) {
    return "(No Claude memory files found. The agent will be synthesized from the default personality only.)";
  }

  return sources
    .map(
      (s) =>
        `### From project: ${s.projectPath}\n\n${s.content.trim()}`,
    )
    .join("\n\n---\n\n");
}
