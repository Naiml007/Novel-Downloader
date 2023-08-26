import dotenv from "dotenv";
dotenv.config();

import { providers } from "./mapping";
import { fetchCorsProxies } from "./helper/proxies";
import { createPDFs } from "./lib/createPDF";

fetchCorsProxies().then(async () => {
    //const id = "/series/a-very-popular-idol-classmate-has-taken-a-liking-to-me-a-person-who-doesnt-want-to-work-for-whole-life/";
    const id = "/series/the-story-of-two-engaged-childhood-friends-trying-to-fall-in-love/";
    const info = await providers.novelupdates.info(id);
    console.log(info);

    const chapters = await providers.novelupdates.fetchChapters(id);
    if (!chapters || chapters.length === 0) {
        console.log("Failed to fetch chapters");
        return;
    }

    console.log("Fetched " + chapters.length + " chapters");

    await createPDFs("novelupdates", chapters.slice(0, 2), info!).then(console.log);
});
