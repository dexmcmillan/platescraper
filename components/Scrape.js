const p = require('puppeteer')
const _ = require('lodash')
const fs = require('fs')

class Scrape {

    results = []

    // Urls will be loaded into here on object construction.
    urlList = []

    // Defines how information is collected off the page, and how it's structured.
    template;

    // Specifies the maximum number of async calls the scrape should make.
    speed;

    // The maximum number of times a page will error out and retry itself before stopping.
    maximum_tries;

    // This is the location where the output file will be saved.
    save_as;

    // The puppeteer options.
    puppeteerOptions = {};

    next_page_button;

    pages;

    unit;
    save_stream;

    constructor(templateName) {

        let template = JSON.parse(fs.readFileSync(`./templates/${templateName}.json`).toString())

        console.log(template)

        this.template_name = template.template_name
        this.template = template.template
        this.maximum_tries = template.settings.maximum_tries
        this.speed = template.settings.speed
        this.urlList = template.urls
        this.puppeteerOptions = template.settings.puppeteerOptions
        this.pages = template.pages
        this.next_page_button = template.next_page_button
        this.unit = template.unit

        this.save_as = template.settings.save_as
        this.save_stream = fs.createWriteStream(`./output/${this.save_as}`)

        console.log(`New scrape started!\nBased on template: ${this.template_name}.`)

        return this
    }

    // This method is one of the primary methods for scraping pages.
    // It takes an array of urls and goes through each of them asynchronously (with limits) to grab information.
    async run(urls = this.urlList) {
        return new Promise(async (resolve) => {

            // Chunks urls for async scraping.
            const urlChunks = await _.chunk(urls, this.speed)

            // New puppeteer browser instance.
            const browser = await p.launch(this.puppeteerOptions);

            // For each one of the url chunks...
            for (const chunk of urlChunks) {

                const promises = []
                let timesFailed = 0

                // ...go through each url.
                chunk.forEach(url => {

                    // ...create a new promise to grab the required info from the scrape template...
                    const promise = new Promise(async (resolve) => {
                        while (timesFailed <= this.maximum_tries) {

                            const page = await browser.newPage();
                            await page.exposeFunction('getRecord', this.getRecord);
                            // page.on('console', consoleObj => console.log(consoleObj.text()));

                            try {
                                await Promise.all([
                                    page.goto(url),
                                    page.waitForNavigation({ waitUntil: "networkidle0" })
                                ])


                                for (let pageNum = 1; pageNum <= this.pages; pageNum++) {

                                    var records = await this.scrapePage(page)

                                    if (this.pages > 1 && pageNum !== this.pages) {
                                        try {
                                            await Promise.all([
                                                page.click(this.next_page_button),
                                                page.waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 })
                                            ])
                                        } catch {
                                        }

                                    }
                                    records.map(el => this.results.push(el))
                                }
                                console.log(`Found ${this.results.length} records...`)
                                page.close()
                                return resolve(JSON.stringify(this.results))
                            } catch (err) {
                                console.log(err)
                                timesFailed++
                            }

                        }
                    })

                    promises.push(promise)

                })

                await Promise.all(promises)

            }
            browser.close()
            return resolve(JSON.stringify(this.results))
        })
    }

    async urls(url, selector) {

        console.log("Grabbing urls...")

        // New puppeteer browser instance.
        const browser = await p.launch(this.puppeteerOptions);

        const page = await browser.newPage();
        page.on('console', consoleObj => console.log(consoleObj.text()));

        await Promise.all([
            page.goto(url),
            page.waitForNavigation({ waitUntil: "networkidle0" })
        ])

        const urls = await page.evaluate((selector) => {

            const urlsArray = []

            const rows = document.querySelectorAll(selector)

            rows.forEach(row => {
                const link = row.href
                urlsArray.push(link)
            })

            return urlsArray

        }, selector)

        await urls.map(el => this.urlList.push(el))
        browser.close()
        return this.urlList
    }

    async getRecord(page, element = null) {

        const pageResults = await page.evaluate(async (template, element) => {
            let record = {}
            // This checks whether or not the info to be scraped is a single entry, a table, or a form-style table to be scraped, as specified by the scrape template file.
            for (const field of Object.entries(template)) {

                if (element === null) {
                    var rows = document.querySelectorAll(`${field[1].table_selector}`)
                }
                else {
                    var rows = element.querySelectorAll(`${field[1].table_selector}`)
                }

                if (field[1].type === "single_field") {

                    if (element === null) {
                        record[field[0]] = document.querySelector(field[1].selector).innerText
                    }
                    else {
                        record[field[0]] = element.querySelector(field[1].selector).innerText
                    }

                    record[field[0]] = record[field[0]].replace(field[1].replace, "")
                }

                else if (field[1].type === "table") {

                    record[field[0]] = []



                    rows.forEach(row => {

                        let subfield = {}
                        for (const row_field of Object.entries(field[1].row_object_template)) {
                            subfield[row_field[0]] = row.querySelector(row_field[1]).innerText
                        }
                        record[field[0]].push(subfield)

                    })
                }
                else if (field[1].type === "form") {

                    rows = document.querySelectorAll(`${field[1].selector} tr`)

                    rows.forEach(row => {

                        const key = row.querySelector("td:nth-child(1)").innerText.toLowerCase().replace(/\s/, "_")

                        record[key] = row.querySelector("td:nth-child(2)").innerText.replace(/\n/, " ")


                    })

                }

            }
            return record
        }, this.template, element)
        return pageResults
    }

    async scrapePage(page) {

        page.on('console', consoleObj => console.log(consoleObj.text()));


        let pageResults = []

        if (this.unit === "page" || this.unit === "" || this.unit === null) {

            const record = await this.getRecord(page)

            record.scrapedAt = new Date().toLocaleString()
            pageResults.push(record)

        }
        else {

            const rows = await page.$$(this.unit)

            for (const item of rows) {
                const record = await this.getRecord(page, item)
                record.scrapedAt = new Date().toLocaleString()
                pageResults.push(record)

            }
        }

        return pageResults
    }

};

module.exports = { Scrape }