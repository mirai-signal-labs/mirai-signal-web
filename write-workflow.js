const fs = require('fs');
const path = require('path');

const content = `name: Daily Pipeline
on:
  schedule:
    - cron: '0 22 * * *'
  workflow_dispatch:
jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm ci
      - name: Run pipeline
        env:
          SUPABASE_URL: \${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: \${{ secrets.SUPABASE_ANON_KEY }}
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
        run: |
          npx tsx scripts/save-articles.ts
          npx tsx scripts/process-articles.ts
          npx tsx scripts/send-newsletter.ts
`;

const outputPath = path.join(process.cwd(), '.github', 'workflows', 'daily-pipeline.yml');
fs.writeFileSync(outputPath, content, 'utf8');
console.log('完了: ' + outputPath);
