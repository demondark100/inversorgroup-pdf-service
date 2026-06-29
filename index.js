import express from "express";
import puppeteer from "puppeteer-core"; // Importamos el core ligero
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

app.use(cors());

app.use(
    express.json({
        limit: "10mb",
    }),
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
    }),
);

app.post("/generar-pdf", async (req, res) => {
    const { html, filename = "reporte.pdf" } = req.body;

    if (!html) {
        return res.status(400).json({
            success: false,
            error: "Sin contenido HTML",
        });
    }

    let browser = null;

    try {
        if (isProduction) {
            const BROWSERLESS_TOKEN =
                process.env.BROWSERLESS_TOKEN ||
                "2Ulxog4svEnck3B8641f2c103002e237dbadb69e9aa6e4737";

            browser = await puppeteer.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
            });
        } else {
            browser = await puppeteer.launch({
                executablePath:
                    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Ruta estándar en Windows
                headless: "new",
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
        }

        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "networkidle0",
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: {
                top: "10mm",
                bottom: "20mm",
                left: "10mm",
                right: "10mm",
            },
            printBackground: true,
            displayHeaderFooter: true,
            footerTemplate: `
                <div style="width:100%; font-size:10px; color:#999; text-align:right; padding-right:15mm;">
                    Pagina <span class="pageNumber"></span> di <span class="totalPages"></span>
                </div>
            `,
            headerTemplate: "<div></div>",
        });

        const base64 = Buffer.from(pdfBuffer).toString("base64");

        res.json({
            success: true,
            pdf: base64,
            filename,
        });
    } catch (error) {
        console.error("Error generando PDF:", error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "PDF Service running running smoothly",
        env: process.env.NODE_ENV || "development",
    });
});

app.listen(PORT, () => {
    console.log(`PDF Service corriendo en http://localhost:${PORT}`);
});
