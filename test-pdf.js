const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const fs = require("fs");

async function test() {
    try {
        console.log("Testing pdf-parse...");
        // Just a dummy test with empty buffer or similar if possible
        const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF");
        const data = await pdfParse(buffer);
        console.log("Success! Extracted text length:", data.text.length);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
