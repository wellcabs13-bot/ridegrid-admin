/* Read-only production smoke. Requires an already-running local build.
 * No provider, generation, booking, payment or publication actions are invoked. */
const { loadEnvConfig } = require("@next/env");
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  loadEnvConfig(process.cwd());
  const baseURL = process.env.WEBSITE_SMOKE_URL || "http://localhost:3107";
  if (!['localhost','127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error("Smoke checks require a local server.");
  const output = path.resolve("docs/website-seo");
  fs.mkdirSync(output,{recursive:true});
  const db = new PrismaClient();
  const browser = await chromium.launch({headless:true});
  const report = { checkedAt:new Date().toISOString(), public:[], responsive:[], dashboard:[], apiFailures:[], pageErrors:[], unauthorized:[] };
  try {
    const context = await browser.newContext({baseURL});
    const page = await context.newPage();
    page.on('pageerror',error => report.pageErrors.push(error.message));
    page.on('response',response => { if (response.url().includes('/api/website-seo/') && response.status() >= 400) report.apiFailures.push({path:new URL(response.url()).pathname,status:response.status()}); });
    for(const width of [390,768,1280,1536]) {
      await page.setViewportSize({width,height:1000});
      const response = await page.goto('/',{waitUntil:'networkidle'});
      const layout = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,brokenImages:[...document.images].filter(i=>i.complete && i.naturalWidth === 0).length,missingAnchors:[...document.querySelectorAll('a[href^="/#"]')].map(a=>a.getAttribute('href').slice(2)).filter(id=>!document.getElementById(id))}));
      report.responsive.push({width,status:response.status(),...layout});
      await page.screenshot({path:path.join(output,`homepage-${width}.png`),fullPage:true});
      if(width===390) {
        await page.locator('summary').filter({hasText:'Menu'}).click();
        await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Outstation',exact:true}).click();
        if(await page.locator('details[open]').count()) throw new Error('Mobile menu did not close.');
      }
    }
    const info = ['privacy-policy','terms-and-conditions','cancellation-refund-policy','cookie-policy','disclaimer','accessibility','about','contact','payment-refund-information','business-travel-terms'];
    for (const slug of info) {
      const response = await page.goto(`/${slug}`,{waitUntil:'networkidle'});
      report.public.push({path:`/${slug}`,status:response.status(),h1:await page.locator('h1').count(),canonical:await page.locator('link[rel="canonical"]').getAttribute('href')});
    }
    await page.goto('/privacy-policy',{waitUntil:'networkidle'});
    await page.screenshot({path:path.join(output,'privacy-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(output,'privacy-mobile.png'),fullPage:true});
    for(const route of ['entities','homepage','media/ai-images','scale/overview']) {
      const response = await context.request.get(`/api/website-seo/${route}`);
      report.unauthorized.push({path:route,status:response.status()});
    }
    const admin = await db.user.findFirst({where:{role:'SUPER_ADMIN'},select:{id:true,role:true}});
    if(!admin || !process.env.JWT_SECRET) throw new Error('Administrator configuration unavailable.');
    await context.addCookies([{name:'ridegrid_access_token',value:jwt.sign(admin,process.env.JWT_SECRET,{expiresIn:'30m'}),url:baseURL,httpOnly:true,sameSite:'Lax'}]);
    await page.setViewportSize({width:1440,height:1000});
    function routes(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?routes(path.join(dir,e.name)):e.name==='page.tsx'?['/'+path.dirname(path.join(dir,e.name)).replaceAll('\\','/').replace(/^app\//,'')]:[]); }
    for (const route of routes('app/website-seo')) {
      const response = await page.goto(route,{waitUntil:'domcontentloaded',timeout:60000});
      const failed = await page.getByText('Application error:',{exact:false}).count();
      report.dashboard.push({path:route,status:response.status(),destination:new URL(page.url()).pathname,rendered:!failed});
      if(report.dashboard.length%10===0) console.log(`Checked ${report.dashboard.length} dashboard routes.`);
    }
    await context.close();
  } finally { await browser.close(); await db.$disconnect(); fs.writeFileSync(path.join(output,'browser-validation.json'),JSON.stringify(report,null,2)+'\n'); }
  const failed = report.pageErrors.length || report.apiFailures.length || report.responsive.some(r=>r.status!==200||r.scrollWidth>r.width||r.h1!==1||r.brokenImages||r.missingAnchors.length) || report.public.some(r=>r.status!==200||r.h1!==1) || report.dashboard.some(r=>r.status!==200||!r.rendered) || report.unauthorized.some(r=>r.status!==403);
  console.log(JSON.stringify({public:report.public.length,responsive:report.responsive.length,dashboard:report.dashboard.length,apiFailures:report.apiFailures,pageErrors:report.pageErrors,result:failed?'FAIL':'PASS'},null,2));
  if(failed) process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
