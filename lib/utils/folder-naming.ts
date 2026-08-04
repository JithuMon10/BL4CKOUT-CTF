/**
 * Utility to generate human-readable challenge folder names for CTF organizers.
 * Replaces spaces with exactly three underscores (___), strips invalid filesystem characters,
 * preserves capitalization, and appends ___2, ___3 for collisions.
 */
export function generateHumanReadableFolderName(title: string, existingFolders: string[] = []): string {
  if (!title) return 'Challenge';

  // 1. Strip special symbols like #, ?, !, /, \, :, *, ", <, >, |
  const stripped = title.trim().replace(/[^a-zA-Z0-9\s_-]/g, '');

  // 2. Replace space sequences with exactly three underscores ___
  let folderName = stripped.replace(/\s+/g, '___');

  // Clean trailing/leading underscores if title was punctuation-heavy
  folderName = folderName.replace(/^_+|_+$/g, '');
  if (!folderName) folderName = 'Challenge';

  // 3. Collision resolution
  let finalName = folderName;
  let counter = 2;
  while (existingFolders.includes(finalName)) {
    finalName = `${folderName}___${counter}`;
    counter++;
  }

  return finalName;
}
