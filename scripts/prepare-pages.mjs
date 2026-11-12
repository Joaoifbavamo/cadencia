import fs from 'node:fs';
function copy(from,to){if(!fs.existsSync(to))fs.mkdirSync(to,{recursive:true});for(const e of fs.readdirSync(from,{withFileTypes:true})){if(e.isDirectory())copy(from+'/'+e.name,to+'/'+e.name);else fs.copyFileSync(from+'/'+e.name,to+'/'+e.name)}}
copy('dist','docs');fs.writeFileSync('docs/.nojekyll','');console.log('Site estático preparado em docs/ para GitHub Pages.');
