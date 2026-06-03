import fs from 'fs';
import path from 'path';

const actionsDir = './src/app/actions';
const files = fs.readdirSync(actionsDir);

files.forEach(file => {
  const filePath = path.join(actionsDir, file);
  const stat = fs.statSync(filePath);
  if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasAuth = content.includes('requireAuth') || content.includes('getServerSession');
    console.log(`${hasAuth ? '✅' : '❌'} ${file}`);
  }
});
