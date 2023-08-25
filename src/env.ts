// All environment variables.
export const env = {
    CENSYS_ID: process.env.CENSYS_ID,
    CENSYS_SECRET: process.env.CENSYS_SECRET,

    USE_PUPPETEER: process.env.USE_PUPPETEER === "true",
    PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS === "true",
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === "true",
    PUPPETEER_CHROMIUM_PATH: process.env.PUPPETEER_CHROMIUM_PATH,
    PUPPETEER_WAIT_FOR_NETWORK_IDLE: process.env.PUPPETEER_WAIT_FOR_NETWORK_IDLE === "true",
};
