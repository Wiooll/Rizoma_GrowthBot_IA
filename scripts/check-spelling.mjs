import { readFile } from 'node:fs/promises';

const files = [
  'README.md',
  'frontend/index.html',
  'frontend/js/app.js',
  'frontend/js/local-db.js',
  'frontend/js/pwa.js',
  'hosted/worker.js',
  'hosted/prompt.js',
  'public/manifest.webmanifest',
];

const forbidden = [
  { pattern: /\uFFFD/u, label: 'caractere de substituição Unicode' },
  { pattern: /Ã[¡-¿]/u, label: 'possível texto UTF-8 corrompido' },
  { pattern: /Â[\u0080-\u00bf]/u, label: 'possível texto UTF-8 corrompido' },
  { pattern: /ðŸ|â€|âœ|âš/u, label: 'emoji ou pontuação corrompidos' },
  { pattern: /Configuraçoes|configuraçoes|ortográfia|direcões/u, label: 'erro ortográfico conhecido' },
];

const failures = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) failures.push(`${file}: ${rule.label}`);
  }
}

if (failures.length) {
  console.error(`Verificação ortográfica falhou:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(`Verificação ortográfica e de codificação aprovada em ${files.length} arquivos.`);
