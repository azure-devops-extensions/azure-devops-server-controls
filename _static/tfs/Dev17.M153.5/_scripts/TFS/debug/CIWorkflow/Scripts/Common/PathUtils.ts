export const DefaultPath = "\\";
export const PathSeparator = "/";

export function normalizeSeparators(path: string): string {
    return path.replace(/\\+/g, PathSeparator);
}
