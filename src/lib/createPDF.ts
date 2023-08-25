import { join } from "path";
import { Chapter } from "../mapping/impl";
import { createWriteStream, existsSync } from "fs";
import { mkdir } from "fs/promises";
import PDFDocument from "pdfkit";

import colors from "colors";
import { load } from "cheerio";
import { Readable } from "stream";
import { finished } from "stream/promises";

export const createPDF = async (id: string, providerId: string, chapter: Chapter, pages: string): Promise<string> => {
    const parentFolder = join(__dirname, `./novels/${id}/${providerId}/${chapter.title.replace(/[^\w .-]/gi, "")}`);
    if (existsSync(`${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`)) return `${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`;

    if (!existsSync(parentFolder)) {
        await mkdir(parentFolder, { recursive: true });
    }

    console.log(colors.blue("Creating PDF for ") + colors.green(chapter.title));

    const doc = new PDFDocument();
    const pdfStream = createWriteStream(`${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`);
    doc.pipe(pdfStream);
    doc.info.Title = chapter.title;
    doc.fontSize(18);
    doc.font("Times-Bold").text(chapter.title, {
        width: 500
    });
    doc.fontSize(11);

    const $ = load(pages);

    doc.font("Times-Roman").text($.text());
    doc.end();

    return `${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`;
};

async function downloadFile(file: string, path: string, headers?: any) {
    if (existsSync(path)) return;

    const response = await fetch(file, {
        headers: headers,
    });

    if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status} ${response.statusText}`);
    }

    const fileStream = createWriteStream(path, { flags: "wx" });
    await finished(Readable.fromWeb(response.body as any).pipe(fileStream));
}