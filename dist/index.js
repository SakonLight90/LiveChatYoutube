"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const puppeteer_1 = require("puppeteer");
const app = express();
app.use(express.json());
async function getImageSrc(url) {
    const browser = await puppeteer_1.default.launch({ headless: true });
    const page = await browser.newPage();
    // Skip the banner asking to accept cookies
    await page.setCookie({
        name: "SOCS",
        value: "CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
        domain: ".youtube.com",
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const linkHref = await page.evaluate(() => {
        const linkTag = document.querySelector('link[rel="image_src"]');
        return linkTag ? linkTag.getAttribute("href") : null;
    });
    await browser.close();
    return linkHref;
}
function extractIdFromImageSrc(url) {
    const match = url.match(/vi\/([^\/]*)\//);
    return match ? match[1] : "";
}
app.get("/", async (req, res) => {
    if (!req.query.channel) {
        res.send("You are missing the 'channel' query parameter");
        return;
    }
    const imageSrc = await getImageSrc(`https://www.youtube.com/@${req.query.channel}/live`);
    const errMsg = "This channel doesn't seem to be streaming as of right now or I was unable to fetch the live URL.";
    if (!imageSrc || imageSrc === "")
        return res.send(errMsg);
    const extractedId = extractIdFromImageSrc(imageSrc);
    if (!extractedId || extractedId === "")
        return res.send(errMsg);
    res.redirect("https://www.youtube.com/live_chat?is_popout=1&v=" + extractedId);
});
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
//# sourceMappingURL=index.js.map