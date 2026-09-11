const fs = require("fs");
const { PDFParse } = require("pdf-parse");

async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);

        const parser = new PDFParse({
            data: dataBuffer
        });

        const result = await parser.getText();

        await parser.destroy();

        // Clean extracted PDF text
        const cleanedText = result.text
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return cleanedText;

    } catch (error) {
        console.error("PDF extraction error:", error);
        throw error;
    }
}

module.exports = {
    extractTextFromPDF
};