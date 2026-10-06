import { config } from './config.js';
import { adapters } from './adapters/index.js';
import { createHttpClient } from './lib/http.js';
import { openDb } from './lib/db.js';
import { createSearchService } from './search.js';
import { createApp } from './app.js';

const http = createHttpClient();
const db = openDb(config.dbPath);
const searchService = createSearchService({ adapters, http, db, config });
const app = createApp({ adapters, searchService, db });

app.listen(config.port, () => {
  console.log(`PS5 Deal Finder API on http://localhost:${config.port}  (http mode: ${http.mode})`);
});
