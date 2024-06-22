"use strict";
const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const app = express();

app.use(express.json());

// Custom middleware to track IP addresses
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const timestamp = new Date().toISOString();
    const log = `${timestamp}: Request from IP: ${ip}\n`;
    fs.appendFile("ip_logs.txt", log, (err) => {
        if (err) console.error("Error writing IP log:", err);
    });
    next();
});

// Function to check if a URL is reachable by Puppeteer
async function isUrlReachable(url) {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox'],
        });
        const page = await browser.newPage();
        const response = await page.goto(url, { waitUntil: "domcontentloaded" });
        await browser.close();
        
        if (response && response.status() === 200) {
            return true; // URL is reachable
        } else {
            return false; // URL is not reachable or returned an error status
        }
    } catch (error) {
        console.error("Error while checking URL reachability:", error);
        return false; // Error occurred, URL is not reachable
    }
}

// Function to get the image source URL from a YouTube live page
async function getImageSrc(url) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    // Set a cookie to skip the cookie consent banner
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

// Function to extract video ID from the image source URL
function extractIdFromImageSrc(url) {
    const match = url.match(/vi\/([^\/]*)\//);
    return match ? match[1] : "";
}

// Define the route to handle channel checking and redirection
app.get("/", async (req, res) => {
    if (!req.query.c) {
        res.status(400).send("Missing 'c' query parameter");
        return;
    }

    const channelUrl = `https://www.youtube.com/@${req.query.c}/live`;
    const isReachable = await isUrlReachable(channelUrl);

    if (!isReachable) {
        res.status(404).send("The channel URL is not reachable.");
        return;
    }

    const imageSrc = await getImageSrc(channelUrl);
    const errMsg = "This channel doesn't seem to be streaming right now or I was unable to fetch the live URL.";

    if (!imageSrc || imageSrc === "") {
        res.status(404).send(errMsg);
        return;
    }

    const extractedId = extractIdFromImageSrc(imageSrc);
    if (!extractedId || extractedId === "") {
        res.status(404).send(errMsg);
        return;
    }

    res.redirect(`https://www.youtube.com/live_chat?is_popout=1&v=${extractedId}`);
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
