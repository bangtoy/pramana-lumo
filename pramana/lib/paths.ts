import path from "node:path";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
export const DB_PATH = path.join(DATA_DIR, "pramana.sqlite");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const MODELS_DIR = path.join(DATA_DIR, "models");

export function resolveRef(ref: string): string {
  const match = /^(public|data):(.+)$/.exec(ref);
  if (!match) throw new Error("Invalid file reference.");
  const root = match[1] === "public" ? path.resolve("public") : DATA_DIR;
  const target = path.resolve(root, match[2]);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("File reference is outside the permitted directory.");
  }
  return target;
}
