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
import { Media, providers } from "../mapping";
import webp from "webp-converter";
import TurndownService from "turndown";

export const createPDFs = async (providerId: string, chapters: Chapter[], media: Media): Promise<string> => {
    const parentFolder = join(__dirname, `./novels/${media.id.replace(/[^\w .-]/gi, "")}`);
    if (!existsSync(parentFolder)) {
        await mkdir(parentFolder, { recursive: true });
    }

    const doc = new PDFDocument({
        autoFirstPage: false,
    });
    const pdfStream = createWriteStream(`${parentFolder}/${media.title.replace(/[^\w .-]/gi, "")}.pdf`);
    doc.pipe(pdfStream);

    // Add cover page
    try {
        const coverPath = `${parentFolder}/cover.png`;
        await downloadFile(media.coverImage ?? "", coverPath); // Download the image

        const result = await probe(createReadStream(coverPath)); // Get the image size
        let width = result.width;
        let height = result.height;
        const ratio = (width + height) / 2;
        const a7Ratio = 338.266666661706;
        const scale = a7Ratio / ratio;

        width = width * scale;
        height = height * scale;

        doc.addPage({ size: [width, height] }).image(coverPath, 0, 0, {
            align: "center",
            valign: "center",
            width: width,
            height: height,
        });
    } catch (e) {
        console.error(colors.red("Failed to fetch cover image for ") + colors.green(media.title));
        console.error(e);
    }

    doc.addPage();

    doc.info.Title = media.title;
    doc.fontSize(18);
    doc.font("Times-Bold").text(media.title, {
        width: 500,
    });
    doc.fontSize(11);

    // Add description
    if (media.description) {
        const $ = load(media.description);
        doc.font("Times-Roman").text($.text());
    }

    // Chapters
    const chapterText = chapters.map((chapter) => `${chapter.number}. ${chapter.title}`).join("\n");
    doc.font("Times-Roman").text(chapterText);

    for (let i = 0; i < chapters.length; i++) {
        doc.addPage();

        const chapter = chapters[i];
        const pages = await providers[providerId].fetchPages(chapter.id).catch((err) => {
            console.error(err);
            console.log(colors.red("Failed to fetch pages for ") + colors.green(chapter.title));
            return undefined;
        });

        if (!pages || pages?.length === 0) {
            doc.fontSize(18);
            doc.font("Times-Bold").text(chapter.title, {
                width: 500,
            });
            doc.fontSize(11);
            doc.font("Times-Roman").text("No pages found..");
            continue;
        }

        const $ = load(pages);
        const turndownService = new TurndownService({
            headingStyle: "atx", // Use ATX-style headings
            codeBlockStyle: "fenced", // Use fenced code blocks
            emDelimiter: "_",
            strongDelimiter: "**",
        });

        const elements = $.root().find("*");

        doc.fontSize(18);
        doc.font("Times-Bold").text(chapter.title, {
            width: 500,
        });
        doc.fontSize(11);

        // Prevent duplicate text
        const duplicateText: string[] = [];
        const elementsToInsert: { type: "text" | "image"; content: string; url?: string }[] = [];

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const tagName = element.tagName;

            if (tagName === "img") {
                // Handle images
                const imgSrc = element.attribs.src;
                if (!imgSrc) continue;

                // Check if image is already added
                const isDuplicate = elementsToInsert.some((element) => element.url === imgSrc);
                if (isDuplicate) continue;

                const imgName = `${chapter.title.replace(/[^\w .-]/gi, "")}-image-${i}.${imgSrc.endsWith(".webp") ? "webp" : "png"}`;
                let imagePath = `${parentFolder}/${imgName}`;

                try {
                    await downloadFile(imgSrc, imagePath); // Download the image

                    // Check if webp
                    if (imgSrc.endsWith(".webp")) {
                        try {
                            await webp.dwebp(imagePath, imagePath.replace(".webp", ".png"), "-o");
                            imagePath = imagePath.replace(".webp", ".png");

                            try {
                                if (`${parentFolder}/${imgName}` !== imagePath) await unlink(`${parentFolder}/${imgName}`);
                            } catch (e) {
                                console.error(colors.red("Failed to delete image ") + colors.green(imgName));
                            }
                        } catch (e) {
                            console.error(colors.red("Error converting image ") + colors.green(imgName));
                        }
                    }

                    elementsToInsert.push({ type: "image", content: imagePath, url: imgSrc });

                    // Delete the image
                    //await unlink(imagePath);
                } catch (e) {
                    console.error(colors.red("Failed to fetch image for ") + colors.green(chapter.title));
                    console.error(e);
                }
            } else {
                // Handle duplicate text
                const text = $(element).text();
                const normalizedText = text.trim().replace(/\s/g, "").replace(/[^\w]/gi, "").toLowerCase();

                const isSubstring = duplicateText.some((addedText) => normalizedText.includes(addedText) || addedText.includes(normalizedText));
                if (isSubstring) continue;

                // Text may include images.
                const imgs = $(element).find("img");
                for (let i = 0; i < imgs.length; i++) {
                    const imgElement = $(imgs[i]);

                    if (imgElement) {
                        const imgSrc = imgElement.attr("src");
                        if (!imgSrc) continue;

                        // Get text before and after the image
                        const htmlArray =
                            $(element)
                                .html()
                                ?.split(imgElement.parents().html() ?? "") ?? [];
                        const imageHTML = imgElement.parent().html() ?? "";
                        const textBefore = load(htmlArray[0]).html().replaceAll(imageHTML, "");
                        const textAfter = load(htmlArray[1]).html().replaceAll(imageHTML, "");

                        // Add text before the image
                        const markdownTextBefore = turndownService.turndown(textBefore);
                        const pdfKitFormattedTextBefore = markdownTextBefore
                            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // **bold**
                            .replace(/_(.*?)_/g, "<i>$1</i>"); // _italic_

                        const formattedTextBefore = $("<div>").html(pdfKitFormattedTextBefore).text(); // Remove HTML entities
                        elementsToInsert.push({ type: "text", content: formattedTextBefore });

                        const imgName = `${chapter.title.replace(/[^\w .-]/gi, "")}-image-${i}.${imgSrc.endsWith(".webp") ? "webp" : "png"}`;
                        let imagePath = `${parentFolder}/${imgName}`;

                        try {
                            await downloadFile(imgSrc, imagePath); // Download the image

                            // Check if webp
                            if (imgSrc.endsWith(".webp")) {
                                try {
                                    await webp.dwebp(imagePath, imagePath.replace(".webp", ".png"), "-o");
                                    imagePath = imagePath.replace(".webp", ".png");

                                    try {
                                        if (`${parentFolder}/${imgName}` !== imagePath) await unlink(`${parentFolder}/${imgName}`);
                                    } catch (e) {
                                        console.error(colors.red("Failed to delete image ") + colors.green(imgName));
                                    }
                                } catch (e) {
                                    console.error(colors.red("Error converting image ") + colors.green(imgName));
                                }
                            }
                            elementsToInsert.push({ type: "image", content: imagePath, url: imgSrc });
                        } catch (e) {
                            console.error(colors.red("Failed to fetch image for ") + colors.green(chapter.title));
                            console.error(e);
                        }

                        // Add text after the image
                        const markdownTextAfter = turndownService.turndown(textAfter);
                        const pdfKitFormattedTextAfter = markdownTextAfter
                            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // **bold**
                            .replace(/_(.*?)_/g, "<i>$1</i>"); // _italic_

                        const formattedTextAfter = $("<div>").html(pdfKitFormattedTextAfter).text(); // Remove HTML entities
                        elementsToInsert.push({ type: "text", content: formattedTextAfter });

                        duplicateText.push(normalizedText); // Add text to the set
                    } else {
                        const markdownText = turndownService.turndown($(element).html());

                        // Edit markdown to be formatted here
                        const pdfKitFormattedText = markdownText
                            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // **bold**
                            .replace(/_(.*?)_/g, "<i>$1</i>"); // _italic_

                        const formattedText = $("<div>").html(pdfKitFormattedText).text(); // Remove HTML entities
                        elementsToInsert.push({ type: "text", content: formattedText });

                        duplicateText.push(normalizedText); // Add text to the set
                    }
                }

                if (imgs.length === 0) {
                    const markdownText = turndownService.turndown($(element).html());

                    // Edit markdown to be formatted here
                    const pdfKitFormattedText = markdownText
                        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // **bold**
                        .replace(/_(.*?)_/g, "<i>$1</i>"); // _italic_

                    const formattedText = $("<div>").html(pdfKitFormattedText).text(); // Remove HTML entities
                    elementsToInsert.push({ type: "text", content: formattedText });

                    duplicateText.push(normalizedText); // Add text to the set
                }
            }
        }

        // Insert elements in the correct order into the PDF
        for (const elementToInsert of elementsToInsert) {
            if (elementToInsert.type === "text") {
                doc.font("Times-Roman").text(elementToInsert.content);
            } else if (elementToInsert.type === "image") {
                try {
                    const imagePath = elementToInsert.content;
                    const result = await probe(createReadStream(imagePath));
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
                } catch (e) {
                    console.error(colors.red("Failed to add image for ") + colors.green(chapter.title));
                    console.error(e);
                }
                doc.addPage();
            }
        }

        console.log(colors.yellow("Fetched ") + colors.green(i + 1 + "/" + chapters.length) + colors.yellow(" chapters"));
    }

    doc.end();

    return `${parentFolder}/${media.title.replace(/[^\w .-]/gi, "")}.pdf`;
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
