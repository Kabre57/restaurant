import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Permission } from '@/domain/security/permissions';

const srcDir = path.resolve(__dirname, '../../../src');
const stringRegex = /(?:'([^'\n]+)'|"([^"\n]+)"|`([^`\n]+)`)/g;
const permissionPattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;

const allowedPermissions = new Set<string>(Object.values(Permission));

function isPermissionKeyCandidate(str: string): boolean {
  if (!permissionPattern.test(str)) {
    return false;
  }
  // Ignorer les chaînes numériques (ex: "1.18", "0.05")
  if (!isNaN(Number(str))) {
    return false;
  }
  // Ignorer les fichiers (extensions courantes)
  const ignoredExtensions = ['.pdf', '.xls', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.json', '.ts', '.tsx', '.prisma', '.css', '.map', '.txt', '.md'];
  if (ignoredExtensions.some(ext => str.toLowerCase().endsWith(ext))) {
    return false;
  }
  // Ignorer les cookies next-auth et jetons de session
  if (str.includes('session-token')) {
    return false;
  }
  // Ignorer les évènements Stripe
  const stripePrefixes = ['payment_intent.', 'payment_method.', 'checkout.session.', 'charge.', 'setup_intent.'];
  if (stripePrefixes.some(prefix => str.toLowerCase().startsWith(prefix))) {
    return false;
  }
  // Ignorer les classes CSS/Tailwind
  const cssPrefixes = [
    'space-', 'gap-', 'w-', 'h-', 'p-', 'm-', 'grid-', 'col-', 'row-', 'border-', 'rounded-',
    'duration-', 'bg-', 'text-', 'shadow-', 'scale-', 'opacity-', 'divide-', 'inset-', 'z-',
    'top-', 'bottom-', 'left-', 'right-', 'translate-', 'rotate-', 'skew-', 'origin-', 'delay-',
    'ease-', 'transition-', 'animate-', 'blur-', 'contrast-', 'grayscale-', 'invert-', 'sepia-',
    'saturate-', 'hue-', 'backdrop-', 'pointer-', 'cursor-', 'select-', 'resize-', 'scroll-',
    'self-', 'justify-', 'items-', 'content-', 'flex-', 'grow-', 'shrink-', 'order-', 'float-',
    'clear-', 'object-', 'overflow-', 'position-', 'visible-', 'invisible-', 'sr-'
  ];
  if (cssPrefixes.some(prefix => str.startsWith(prefix))) {
    return false;
  }
  return true;
}

function walk(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(fullPath, callback);
      }
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      callback(fullPath);
    }
  }
}

describe('Magic Strings Security Check', () => {
  it('should not contain literal strings for permissions (all must use Permission enum or custom.*)', () => {
    const failures: { file: string; line: number; value: string }[] = [];

    walk(srcDir, (filePath) => {
      // Ignorer le fichier de définition de l'enum et les fichiers de configuration par défaut
      const relPath = path.relative(srcDir, filePath);
      if (
        relPath === 'domain/security/permissions.ts' ||
        relPath.startsWith('app/utils/permissions/')
      ) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        let match;
        stringRegex.lastIndex = 0;
        while ((match = stringRegex.exec(line)) !== null) {
          const val = match[1] || match[2] || match[3];
          if (val && isPermissionKeyCandidate(val)) {
            // Doit commencer par 'custom.' ou être dans l'enum Permission
            if (!val.startsWith('custom.') && !allowedPermissions.has(val)) {
              failures.push({
                file: path.relative(path.resolve(srcDir, '..'), filePath),
                line: index + 1,
                value: val,
              });
            }
          }
        }
      });
    });

    if (failures.length > 0) {
      const errorMsg = failures
        .map((f) => `  - ${f.file}:${f.line} -> "${f.value}"`)
        .join('\n');
      throw new Error(
        `Des chaînes magiques représentant des clés de permission non enregistrées ont été trouvées. Toutes les clés système doivent passer par l'enum Permission ou utiliser le préfixe 'custom.'.\nFichiers concernés :\n${errorMsg}`
      );
    }

    expect(failures.length).toBe(0);
  });
});
