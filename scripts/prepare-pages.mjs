import fs from 'node:fs';
fs.cpSync('dist','docs',{recursive:true});fs.writeFileSync('docs/.nojekyll','');console.log('Site estático preparado em docs/ para GitHub Pages.');
