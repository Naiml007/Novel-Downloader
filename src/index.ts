import dotenv from "dotenv";
dotenv.config();

import { providers } from "./mapping";
import { fetchCorsProxies } from "./helper/proxies";
import { createPDF } from "./lib/createPDF";

fetchCorsProxies().then(async() => {
    await providers.novelupdates.fetchChapters("/series/kimi-wo-ushinaitakunai-boku-to-boku-no-shiawase-wo-negau-kimi/").then(async(data) => {
        console.log("Fetched chapters");
        if (!data![1]) return console.log("No chapters found");
        const pages = await providers.novelupdates.fetchPages(data![1].id);
        if (pages?.length === 0) return console.log("No pages found");
        console.log("Fetched pages")
        await createPDF(data![1].id, "novelupdates", data![1], pages ?? "").then(console.log);
    })
})