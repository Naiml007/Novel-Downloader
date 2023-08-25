import dotenv from "dotenv";
dotenv.config();

import { providers } from "./mapping";
import { fetchCorsProxies } from "./helper/proxies";
import { createPDF } from "./lib/createPDF";

fetchCorsProxies().then(async() => {
    await providers.novelupdates.fetchChapters("/series/kimi-wo-ushinaitakunai-boku-to-boku-no-shiawase-wo-negau-kimi/").then(async(data) => {
        const pages = await providers.novelupdates.fetchPages(data![1].id);
        console.log(pages);
        await createPDF(data![1].id, "novelupdates", data![1], pages ?? "").then(console.log);
    })
})