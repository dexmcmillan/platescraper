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
        this.click_through = template.click_through

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
                            page.on('console', consoleObj => console.log(consoleObj.text()));

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

    async urls(url, selector, nextPageButton = this.next_page_button) {

        var urls = await this.getUrls(url, selector)
        await Promise.all([
            page.click(nextPageButton),
            page.waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 })
        ])

        urls.map(el => this.urlList.push(el))
        return this.urlList

    }

    async getUrls(url, selector) {

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

        browser.close()
        return urls

    }

    async getRecord(page, item = page) {

        let record = {}

        console.log("getRecord started.")
        // This checks whether or not the info to be scraped is a single entry, a table, or a form-style table to be scraped, as specified by the scrape template file.
        for (const field of Object.entries(this.template)) {




            if (field[1].type === "single_field") {
                record[field[0]] = await item.$eval(`${field[1].selector}`, el => el.innerText)
                
                record[field[0]] = record[field[0]].replace(field[1].replace, "")
                console.log(record[field[0]])
            }



            else if (field[1].type === "table") {

                let rows = await page.$$(`${field[1].table_selector}`)

                record[field[0]] = []

                for (const row of rows) {

                    let subfield = {}
                    for (const row_field of Object.entries(field[1].row_object_template)) {
                        subfield[row_field[0]] = await row.$eval(row_field[1], el => el.innerText)
                    }
                    record[field[0]].push(subfield)

                }
            }
            else if (field[1].type === "form") {

                const rows = await item.$$(`${field[1].selector} tr`)

                for (const row of rows) {

                    const key = await row.$eval("td:nth-child(1)", el => el.innerText).toLowerCase().replace(/\s/, "_")

                    record[key] = await row.$eval("td:nth-child(2)", el => el.innerText).replace(/\n/, " ")


                }

            }





        }
        console.log(record)
        return record
    }

    async scrapePage(page) {

        page.on('console', consoleObj => console.log(consoleObj.text()));

        let pageResults = []

        await page.$$eval(`${this.unit} ${this.click_through}`, el => el.map(x => {
            x.setAttribute("formtarget", "_blank")
        }));

        let rows = await page.$$(`${this.unit} ${this.click_through}`)
        
        console.log(rows.length)
        if (this.click_through !== undefined) {

            for (let i = 1; i <= rows.length; i++) {


                await Promise.all([
                    page.click(`${this.unit}:nth-of-type(${i}) ${this.click_through}`),
                    page.waitForNavigation({ waitUntil: "networkidle0" })
                ])

                var record = await this.getRecord(page)

                await Promise.all([
                    page.goBack(),
                    page.waitForNavigation({ waitUntil: "networkidle0" })
                ])

                rows = await page.$$(`${this.unit} ${this.click_through}`)
                
            }

        } else {

            rows = await page.$$(`${this.unit} ${this.click_through}`)

            for (const item of rows) {
                var record = await this.getRecord(page, item)
            }

        }

        record.scrapedAt = new Date().toLocaleString()
        pageResults.push(record)
        return pageResults
    }

};

module.exports = { Scrape }