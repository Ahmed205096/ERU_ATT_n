"use server";

import dbConnect from "@/lib/mongodb";
import ProjectIdea from "@/models/ProjectIdea";
import { revalidatePath } from "next/cache";

export async function parsePdfIdeas(formData: FormData, courseId: string, adminId: string) {
    try {
        await dbConnect();
        const file = formData.get("file") as File;
        
        if (!file) {
            throw new Error("No file uploaded");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Dynamically import pdf2json (only when this function is called)
        const PDFParser = (await import("pdf2json")).default;
        const pdfParser = new (PDFParser as any)(null, 1); // 1 = text only
        
        const text: string = await new Promise((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", () => {
                resolve(pdfParser.getRawTextContent());
            });
            pdfParser.parseBuffer(buffer);
        });

        // Improved extraction strategy:
        // 1. Clean up common PDF artifacts
        const cleanText = text.replace(/\r/g, '\n').replace(/\t/g, ' ');
        
        // 2. Split by the numbering pattern (e.g., "1. ", "2. ")
        const matches = cleanText.split(/\n(?=\d+\.\s+)/);
        
        const generatedIdeas = [];
        
        for (const part of matches) {
            const trimmedPart = part.trim();
            if (!trimmedPart || trimmedPart.length < 5) continue;
            
            if (!/^\d+\.\s+/.test(trimmedPart)) continue;

            let title = "";
            let description = "";

            const lines = trimmedPart.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length > 1) {
                title = lines[0].replace(/^\d+\.\s+/, '').trim();
                description = lines.slice(1).join(' ').trim();
            } else {
                const fullText = lines[0].replace(/^\d+\.\s+/, '').trim();
                const firstPeriod = fullText.indexOf('. ');
                if (firstPeriod > 0) {
                    title = fullText.substring(0, firstPeriod).trim();
                    description = fullText.substring(firstPeriod + 1).trim();
                } else {
                    title = fullText;
                    description = "Imported from PDF";
                }
            }

            if (title && title.length < 200) {
                generatedIdeas.push({
                    courseId,
                    title,
                    description: description || "Detailed in PDF",
                    source: "admin_pdf",
                    createdBy: adminId,
                    isApproved: true
                });
            }
        }

        if (generatedIdeas.length > 0) {
            await ProjectIdea.insertMany(generatedIdeas);
        }

        revalidatePath(`/admin/courses/${courseId}/projects`);
        return { success: true, count: generatedIdeas.length };
    } catch (e: any) {
        console.error("PDF parse error:", e);
        throw new Error(e.message || "Failed to parse PDF");
    }
}
