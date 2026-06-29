import express from "express";
import puppeteer from "puppeteer-core";
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

let browserInstance = null;

async function getBrowser() {
    if (browserInstance) return browserInstance;

    if (isProduction) {
        const TOKEN = process.env.BROWSERLESS_TOKEN;

        console.log("Conectando a Browserless...");

        browserInstance = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${TOKEN}`,
        });
    } else {
        browserInstance = await puppeteer.launch({
            executablePath:
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",

            headless: "new",

            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    console.log("Browser listo");

    return browserInstance;
}

app.post("/generar-pdf", async (req, res) => {
    const { html, filename = "reporte.pdf" } = req.body;

    if (!html) {
        return res.status(400).json({
            success: false,

            error: "Sin contenido HTML",
        });
    }

    let page = null;

    try {
        const browser = await getBrowser();

        page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "domcontentloaded",
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
                <div style="
                width:100%;
                font-size:10px;
                color:#999;
                text-align:right;
                padding-right:15mm;
                ">

                Pagina 
                <span class="pageNumber"></span>
                di
                <span class="totalPages"></span>

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
        console.error("Error PDF:", error);

        res.status(500).json({
            success: false,

            error: error.message,
        });
    } finally {
        if (page) {
            await page.close();
        }
    }
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",

        message: "PDF Service running smoothly",

        env: process.env.NODE_ENV || "development",
    });
});

app.listen(PORT, () => {
    console.log(`PDF Service corriendo en http://localhost:${PORT}`);
});
