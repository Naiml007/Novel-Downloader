import { join } from "path";
import { Chapter } from "../mapping/impl";
import { createReadStream, createWriteStream, existsSync } from "fs";
import { mkdir, unlink } from "fs/promises";
import PDFDocument from "pdfkit";

import colors from "colors";
import { load } from "cheerio";
import { Readable } from "stream";
import { finished } from "stream/promises";
import probe from "probe-image-size";

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
    const elements = $.root().find("*");

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const tagName = element.tagName;

        if (tagName === "img") {
            // Handle images
            const imgSrc = element.attribs.src;
            const imgName = imgSrc.substring(imgSrc.lastIndexOf("/") + 1);
            const imagePath = `${parentFolder}/${imgName}`;

            await downloadFile(imgSrc, imagePath); // Download the image

            const result = await probe(createReadStream(imagePath)); // Get the image size
            let width = result.width;
            let height = result.height;
            const ratio = (width + height) / 2;
            const a7Ratio = 338.266666661706;
            const scale = a7Ratio / ratio;

            width = width * scale;
            height = height * scale;

            doc.addPage({ size: [width, height] }).image(imagePath, 0, 0, {
                align: "center",
                valign: "center",
                width: width,
                height: height,
            });

            doc.addPage();

            // Delete the image
            await unlink(imagePath);
        } else {
            // Handle text
            const text = $(element).text();
            doc.font("Times-Roman").text(text);
        }
    }

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