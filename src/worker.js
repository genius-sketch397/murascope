const J=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json",...h}});
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const sha=async s=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
async function pbkdf(pw,salt){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:100000},k,256))}
const MAPS=/^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i;
const ytId=s=>{try{const u=new URL(s);if(!["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtu.be"].includes(u.hostname))return null;const id=u.hostname.includes("youtu.be")?u.pathname.split("/").filter(Boolean)[0]:u.searchParams.get("v")||u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null}catch{return null}};
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)+"-"+rnd(2);
const clean=(s,max)=>String(s??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,max);
async function limit(env,k,max,win){const n=Date.now();await env.DB.prepare("DELETE FROM rl WHERE ts<?").bind(n-864e5).run();
 const r=await env.DB.prepare("SELECT COUNT(*) c FROM rl WHERE k=? AND ts>?").bind(k,n-win).first();if(r.c>=max)return false;
 await env.DB.prepare("INSERT INTO rl(k,ts) VALUES(?,?)").bind(k,n).run();return true}
async function user(req,env){const m=(req.headers.get("cookie")||"").match(/ms=([a-f0-9]+)/);if(!m)return null;
 return env.DB.prepare("SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?").bind(await sha(m[1]),Date.now()).first()}
const SEL=`SELECT b.id,b.slug,b.name,c.name cat,c.slug cat_slug,b.area,b.town,b.region,b.description,b.maps_url,b.contact,b.youtube_url,b.created_at,COALESCE(AVG(r.rating),0) avg,COUNT(r.id) n FROM businesses b JOIN categories c ON c.id=b.category_id LEFT JOIN reviews r ON r.business_id=b.id AND r.status='published'`;
function page(title,desc,body,extra=""){return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${E(title)}</title><meta name="description" content="${E(desc)}"><meta property="og:title" content="${E(title)}"><meta property="og:description" content="${E(desc)}"><link rel="stylesheet" href="/app.css">${extra}</head><body>${body}</body></html>`,{headers:{"content-type":"text/html;charset=utf-8","cache-control":"public,max-age=60"}})}
async function bizPage(env,slug,origin){
 const b=await env.DB.prepare(SEL+" WHERE b.slug=? AND b.status='published' GROUP BY b.id").bind(slug).first();if(!b)return new Response("Not found",{status:404});
 const rs=(await env.DB.prepare("SELECT r.id,r.rating,r.body,r.created_at,u.name,(SELECT COUNT(*) FROM votes v WHERE v.review_id=r.id) helpful FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.business_id=? AND r.status='published' ORDER BY r.created_at DESC LIMIT 50").bind(b.id).all()).results;
 const ld={"@context":"https://schema.org","@type":"LocalBusiness",name:b.name,description:b.description,address:{"@type":"PostalAddress",addressLocality:b.town,addressRegion:b.region,addressCountry:"KE"},hasMap:b.maps_url,url:origin+"/b/"+b.slug};
 if(b.n)ld.aggregateRating={"@type":"AggregateRating",ratingValue:b.avg.toFixed(1),reviewCount:b.n};
 const dist=[5,4,3,2,1].map(s=>`<div>${s} stars — ${rs.filter(r=>r.rating==s).length}</div>`).join("");
 return page(`${b.name} — ${b.cat} in ${b.area}, ${b.town} | MuraScope`,b.description.slice(0,155),
 `<header><a class="logo" href="/">Mura<b>Scope</b></a></header><main><p><a href="/">← All businesses</a></p><h1>${E(b.name)}</h1><p class="mu">${E(b.cat)} · ${E(b.area)}, ${E(b.town)}</p>
 <p class="st">${"★".repeat(Math.round(b.avg))}${"☆".repeat(5-Math.round(b.avg))} <b>${b.n?b.avg.toFixed(1):"New"}</b> (${b.n} reviews)</p>${b.youtube_url?`<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${E(ytId(b.youtube_url))}" title="Business video" loading="lazy" allowfullscreen></iframe></div>`:""}<p>${E(b.description)}</p>${b.contact?`<p class="mu">Contact: ${E(b.contact)}</p>`:""}
 <p><a class="btn" href="${E(b.maps_url)}" target="_blank" rel="noopener">Open in Google Maps</a></p><div class="card">${dist}</div><h2>Reviews</h2>
 ${rs.map(r=>`<div class="card"><span class="st">${"★".repeat(r.rating)}</span> <b>${E(r.name)}</b> <span class="mu">${new Date(r.created_at).toLocaleDateString("en-GB")}</span><p>${E(r.body)}</p><button onclick="act('/api/reviews/${r.id}/helpful')">Helpful (${r.helpful})</button> <button onclick="rep('review',${r.id})">Report</button></div>`).join("")||"<p class='mu'>No reviews yet.</p>"}
 <div class="card"><h3>Write a review</h3><select id="r"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select><textarea id="t" rows="4" maxlength="800" placeholder="Describe your genuine experience"></textarea><button onclick="act('/api/businesses/${b.slug}/reviews',{rating:+r.value,body:t.value})">Post review</button> <button onclick="rep('business',${b.id})">Report listing / request correction</button><p class="mu">You need an account — <a href="/#account">sign in</a>.</p></div></main>
 <script>async function act(u,b){const r=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b||{})});const d=await r.json();if(r.ok)location.reload();else alert(d.error||"Failed")}
 function rep(k,id){const reason=prompt("Reason (spam, abuse, wrong info, duplicate, other):");if(reason)fetch("/api/reports",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:k,target_id:id,reason})}).then(r=>r.json()).then(d=>alert(d.error||"Report sent"))}</script>`,
 `<link rel="canonical" href="${origin}/b/${b.slug}"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g,"\\u003c")}</script>`)}
async function login(env,email,pw){const u=await env.DB.prepare("SELECT id,salt,pw FROM users WHERE email=?").bind(email).first();
 if(!u||await pbkdf(pw,u.salt)!==u.pw)return J({error:"Wrong email or password"},401);const t=rnd(32);
 await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)").bind(await sha(t),u.id,Date.now()+6048e5).run();
 return J({ok:1},200,{"set-cookie":`ms=${t}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`})}
export default{async fetch(req,env){
 const url=new URL(req.url),p=url.pathname,m=req.method,ip=req.headers.get("cf-connecting-ip")||"x";
 if(p.startsWith("/api/")){
  try{
  if(m!=="GET"){const o=req.headers.get("origin");if(o&&o!==url.origin)return J({error:"Bad origin"},403);if(!(req.headers.get("content-type")||"").includes("json"))return J({error:"JSON required"},415)}
  const body=m==="GET"?{}:await req.json().catch(()=>({}));const me=await user(req,env);
  const need=()=>me?null:J({error:"Please sign in"},401);let r;
  if(p==="/api/admin/setup"&&m==="POST"){
   if(!env.ADMIN_SETUP_TOKEN)return J({error:"Administrator setup is not configured"},503);
   if(!await limit(env,"admin-setup:"+ip,5,36e5))return J({error:"Too many attempts"},429);
   const supplied=String(body.setup_token||"");
   if(supplied.length!==env.ADMIN_SETUP_TOKEN.length||supplied!==env.ADMIN_SETUP_TOKEN)return J({error:"Invalid setup token"},403);
   const exists=await env.DB.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").first();
   if(exists)return J({error:"An administrator is already configured"},409);
   const email=clean(body.email,120).toLowerCase(),name=clean(body.name,30),pw=String(body.password||"");
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||name.length<2||pw.length<12)return J({error:"Valid email, name and password of at least 12 characters required"},400);
   const salt=rnd(16);
   try{await env.DB.prepare("INSERT INTO users(email,name,salt,pw,role,created_at) VALUES(?,?,?,?, 'admin', ?)").bind(email,name,salt,await pbkdf(pw,salt),Date.now()).run()}
   catch{return J({error:"Email already registered"},409)}
   return login(env,email,pw)
  }
  if(p==="/api/register"&&m==="POST"){if(!await limit(env,"reg:"+ip,5,36e5))return J({error:"Too many attempts"},429);
   const email=clean(body.email,120).toLowerCase(),name=clean(body.name,30),pw=String(body.password||"");
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||name.length<2||pw.length<8)return J({error:"Valid email, name and 8+ char password required"},400);
   const salt=rnd(16);try{await env.DB.prepare("INSERT INTO users(email,name,salt,pw,created_at) VALUES(?,?,?,?,?)").bind(email,name,salt,await pbkdf(pw,salt),Date.now()).run()}catch{return J({error:"Email already registered"},409)}
   return login(env,email,pw)}
  if(p==="/api/login"&&m==="POST"){if(!await limit(env,"login:"+ip,10,9e5))return J({error:"Too many attempts"},429);return login(env,clean(body.email,120).toLowerCase(),String(body.password||""))}
  if(p==="/api/logout"&&m==="POST")return J({ok:1},200,{"set-cookie":"ms=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"});
  if(p==="/api/me")return J({user:me});
  if(p==="/api/categories")return J((await env.DB.prepare("SELECT slug,name FROM categories ORDER BY id").all()).results);
  if(p==="/api/businesses"&&m==="GET"){const q=url.searchParams.get("q"),cat=url.searchParams.get("cat"),min=+url.searchParams.get("min")||0,sort=url.searchParams.get("sort");
   let w=" WHERE b.status='published'";const a=[];if(cat){w+=" AND c.slug=?";a.push(cat)}
   if(q){w+=" AND (b.name LIKE ? OR b.description LIKE ? OR b.area LIKE ? OR b.town LIKE ? OR c.name LIKE ?)";const l="%"+q.replace(/[%_]/g,"")+"%";a.push(l,l,l,l,l)}
   const o=sort==="new"?"b.created_at DESC":sort==="pop"?"n DESC":"avg DESC,n DESC";
   return J((await env.DB.prepare(SEL+w+` GROUP BY b.id HAVING avg>=${min} ORDER BY ${o} LIMIT 60`).bind(...a).all()).results,200,{"cache-control":"public,max-age=30"})}
  if(p==="/api/businesses"&&m==="POST"){const e=need();if(e)return e;if(!await limit(env,"sub:"+me.id,5,864e5))return J({error:"Daily submission limit reached"},429);
   const name=clean(body.name,80),desc=clean(body.description,500),area=clean(body.area,60),maps=clean(body.maps_url,500),youtube=clean(body.youtube_url,300),cat=await env.DB.prepare("SELECT id FROM categories WHERE slug=?").bind(clean(body.category,40)).first();
   if(name.length<2||desc.length<10||!area||!cat)return J({error:"Name, category, description and area are required"},400);if(!MAPS.test(maps))return J({error:"Enter a valid Google Maps link"},400);if(youtube&&!/^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[A-Za-z0-9_-]{11}/.test(youtube))return J({error:"Enter a valid YouTube video link"},400);
   const slug=slugify(name),ins=await env.DB.prepare("INSERT INTO businesses(slug,name,category_id,description,area,maps_url,contact,youtube_url,status,submitted_by,created_at) VALUES(?,?,?,?,?,?,?,?, 'pending',?,?)").bind(slug,name,cat.id,desc,area,maps,clean(body.contact,80)||null,youtube||null,me.id,Date.now()).run();
   return J({ok:1,id:ins.meta.last_row_id,slug,message:"Submitted. It will appear once an administrator approves it."},201)}
  if(r=p.match(/^\/api\/businesses\/([a-z0-9-]+)\/reviews$/)){if(m!=="POST")return J({error:"Method"},405);const e=need();if(e)return e;
   if(!await limit(env,"rev:"+me.id,10,864e5)||!await limit(env,"revip:"+ip,20,864e5))return J({error:"Review limit reached"},429);
   const b=await env.DB.prepare("SELECT id FROM businesses WHERE slug=? AND status='published'").bind(r[1]).first(),rt=+body.rating,t=clean(body.body,800);
   if(!b||!(rt>=1&&rt<=5)||t.length<10)return J({error:"Rating 1–5 and at least 10 characters required"},400);
   await env.DB.prepare("INSERT INTO reviews(business_id,user_id,rating,body,created_at) VALUES(?,?,?,?,?) ON CONFLICT(business_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,created_at=excluded.created_at").bind(b.id,me.id,rt,t,Date.now()).run();return J({ok:1},201)}
  if(r=p.match(/^\/api\/reviews\/(\d+)\/helpful$/)){const e=need();if(e)return e;const rv=await env.DB.prepare("SELECT user_id FROM reviews WHERE id=?").bind(r[1]).first();
   if(!rv||rv.user_id===me.id)return J({error:"Cannot vote on this review"},400);await env.DB.prepare("INSERT OR IGNORE INTO votes(review_id,user_id) VALUES(?,?)").bind(r[1],me.id).run();return J({ok:1})}
  if(p==="/api/reports"&&m==="POST"){const e=need();if(e)return e;if(!await limit(env,"rep:"+me.id,15,864e5))return J({error:"Report limit reached"},429);
   if(!["review","business"].includes(body.kind)||!+body.target_id)return J({error:"Invalid report"},400);
   await env.DB.prepare("INSERT INTO reports(kind,target_id,reason,note,user_id,created_at) VALUES(?,?,?,?,?,?)").bind(body.kind,+body.target_id,clean(body.reason,60),clean(body.note,400),me.id,Date.now()).run();return J({ok:1},201)}
  if(p.startsWith("/api/admin/")){if(!me)return J({error:"Please sign in"},401);if(me.role!=="admin")return J({error:"Forbidden"},403);const D=env.DB;
   if(p==="/api/admin/stats")return J(await D.prepare("SELECT (SELECT COUNT(*) FROM businesses WHERE status='published') businesses,(SELECT COUNT(*) FROM businesses WHERE status='pending') pending,(SELECT COUNT(*) FROM reviews) reviews,(SELECT COUNT(*) FROM reports WHERE status='open' AND kind='review') reported_reviews,(SELECT COUNT(*) FROM businesses WHERE created_at>"+(Date.now()-6048e5)+") new_this_week").first());
   if(p==="/api/admin/pending")return J((await D.prepare("SELECT b.*,c.name cat FROM businesses b JOIN categories c ON c.id=b.category_id WHERE b.status='pending' ORDER BY b.created_at").all()).results);
   if(p==="/api/admin/businesses")return J((await D.prepare("SELECT b.id,b.slug,b.name,b.area,b.status,c.name cat FROM businesses b JOIN categories c ON c.id=b.category_id ORDER BY b.created_at DESC LIMIT 200").all()).results);
   if(p==="/api/admin/reviews")return J((await D.prepare("SELECT r.id,r.rating,r.body,b.name business,u.name FROM reviews r JOIN businesses b ON b.id=r.business_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 100").all()).results);
   if(p==="/api/admin/reports")return J((await D.prepare("SELECT * FROM reports WHERE status='open' ORDER BY created_at DESC LIMIT 100").all()).results);
   if(r=p.match(/^\/api\/admin\/businesses\/(\d+)\/(approve|reject)$/)){await D.prepare("UPDATE businesses SET status=? WHERE id=?").bind(r[2]==="approve"?"published":"rejected",r[1]).run();return J({ok:1})}
   if(r=p.match(/^\/api\/admin\/businesses\/(\d+)$/)){if(m==="DELETE"){await D.prepare("DELETE FROM businesses WHERE id=?").bind(r[1]).run();return J({ok:1})}
    if(m==="PATCH"){const c=body.category?await D.prepare("SELECT id FROM categories WHERE slug=?").bind(body.category).first():null;if(body.maps_url&&!MAPS.test(body.maps_url))return J({error:"Bad Maps link"},400);
     await D.prepare("UPDATE businesses SET name=COALESCE(?,name),description=COALESCE(?,description),area=COALESCE(?,area),maps_url=COALESCE(?,maps_url),category_id=COALESCE(?,category_id) WHERE id=?").bind(clean(body.name,80)||null,clean(body.description,500)||null,clean(body.area,60)||null,body.maps_url||null,c?.id??null,r[1]).run();return J({ok:1})}}
   if((r=p.match(/^\/api\/admin\/reviews\/(\d+)$/))&&m==="DELETE"){await D.prepare("DELETE FROM reviews WHERE id=?").bind(r[1]).run();return J({ok:1})}
   if(r=p.match(/^\/api\/admin\/reports\/(\d+)\/resolve$/)){await D.prepare("UPDATE reports SET status='resolved' WHERE id=?").bind(r[1]).run();return J({ok:1})}
   if(p==="/api/admin/categories"&&m==="POST"){const n=clean(body.name,40);if(!n)return J({error:"Name required"},400);await D.prepare("INSERT INTO categories(slug,name) VALUES(?,?)").bind(n.toLowerCase().replace(/[^a-z0-9]+/g,"-"),n).run();return J({ok:1})}}
  return J({error:"Not found"},404)}catch(e){return J({error:"Server error"},500)}}
 const b=p.match(/^\/b\/([a-z0-9-]+)$/);if(b)return bizPage(env,b[1],url.origin);
 if(p==="/robots.txt")return new Response(`User-agent: *\nDisallow: /admin.html\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`);
 if(p==="/sitemap.xml"){const l=(await env.DB.prepare("SELECT slug FROM businesses WHERE status='published'").all()).results;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc></url>${l.map(x=>`<url><loc>${url.origin}/b/${x.slug}</loc></url>`).join("")}</urlset>`,{headers:{"content-type":"application/xml"}})}
 return env.ASSETS.fetch(req)}};
