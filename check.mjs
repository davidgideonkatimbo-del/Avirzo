import fs from 'fs';
for (const f of ['client/src/main.jsx','client/src/components/ProjectWorkspace.jsx']) {
 const s=fs.readFileSync(f,'utf8');
 let b=0,p=0,c=0; for(const ch of s){if(ch==='(')p++; if(ch===')')p--; if(ch==='{')b++; if(ch==='}')b--; if(ch==='<')c++; if(ch==='>')c--;}
 console.log(f,{paren:p,brace:b,angle:c});
}
