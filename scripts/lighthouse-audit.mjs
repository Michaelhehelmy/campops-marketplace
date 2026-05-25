import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REPORT_DIR = process.env.REPORT_DIR || './lighthouse-reports';
const SUBJECT = process.env.LH_SUBJECT || '';

const urls = SUBJECT
  ? [SUBJECT.startsWith('http') ? SUBJECT : `${BASE_URL}${SUBJECT}`]
  : [
      `${BASE_URL}/`,
      `${BASE_URL}/en`,
      `${BASE_URL}/en/marketplace`,
      `${BASE_URL}/en/login`,
    ];

const opts = {
  logLevel: 'info',
  output: ['html', 'json'],
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
};

async function run() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  opts.port = chrome.port;

  for (const url of urls) {
    console.log(`\nAuditing: ${url}`);
    const result = await lighthouse(url, opts);
    if (!result) { console.error(`  Failed for ${url}`); continue; }

    const score = (cat) => Math.round((result.lhr.categories[cat]?.score ?? 0) * 100);
    console.log(
      `  Performance: ${score('performance')}  ` +
      `Accessibility: ${score('accessibility')}  ` +
      `Best Practices: ${score('best-practices')}  ` +
      `SEO: ${score('seo')}`
    );

    const slug = new URL(url).pathname.replace(/\//g, '_') || 'root';
    const fs = await import('fs');
    const dir = `${REPORT_DIR}/${slug}`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/report.html`, result.report[0]);
    fs.writeFileSync(`${dir}/report.json`, JSON.stringify(result.lhr, null, 2));
    console.log(`  Report saved to ${dir}/`);
  }

  await chrome.kill();
}

run().catch((e) => { console.error(e); process.exit(1); });
