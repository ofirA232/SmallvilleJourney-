import {defineConfig} from '@playwright/test';
import base from './playwright.config';
const deployedUrl=process.env.SMALLVILLE_TEST_URL;
export default defineConfig({
  ...base,
  use:{...base.use,baseURL:deployedUrl??base.use?.baseURL},
  webServer:deployedUrl?undefined:{command:'npm run preview -- --port 5188 --strictPort',url:'http://127.0.0.1:5188',reuseExistingServer:false,timeout:30000},
});
