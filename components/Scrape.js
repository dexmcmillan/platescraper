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

        console.log(this.unit)

        return this
    }

    // This method is one of the primary methods for scraping pages.
    // It takes an array of urls and goes through each of them asynchronously (with limits) to grab information.
    async run(urls=this.urlList) {

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
                        page.on('console', consoleObj => console.log(consoleObj.text()));

                        try {
                            await Promise.all([
                                page.goto(url),
                                page.waitForNavigation({ waitUntil: "networkidle0" })
                            ])


                            for (let pageNum = 1; pageNum <= this.pages; pageNum++) {

                                var records = await this.scrapePage(page)
                                if (this.pages > 1 && pageNum !== this.pages) {
                                    await Promise.all([
                                        page.click(this.next_page_button),
                                        page.waitForNavigation({ waitUntil: "networkidle0" })
                                    ])
                                }
                                records.map(el => this.results.push(el))
                            }

                            page.close()
                            console.log(this.results)
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
        return JSON.stringify(this.results)
    }

    async urls(url, selector) {

        // New puppeteer browser instance.
        const browser = await p.launch(this.puppeteerOptions);

        let timesFailed = 0

        const promise = await new Promise(async (resolve) => {
            while (timesFailed <= this.maximum_tries) {

                const page = await browser.newPage();
                page.on('console', consoleObj => console.log(consoleObj.text()));

                try {
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

                    page.close()
                    return resolve(urls)
                } catch (err) {
                    console.log(err)
                    timesFailed++
                }




            }
        })
        browser.close()
        return promise
    }

    async scrapePage(page) {

        const pageResults = await page.evaluate(async (template, unit) => {
            const pageResults = []

            console.log("Start of evaluate.")

            if (unit === "page") {
                let record = {}
                console.log("It's a page!")
                // This checks whether or not the info to be scraped is a single entry or a table to be scraped, as specified by the scrape template file.
                for (const field of Object.entries(template)) {

                    if (field[1].type === "single_field") {

                        record[field[0]] = document.querySelector(field[1].selector).innerText
                        record[field[0]] = record[field[0]].replace(field[1].replace, "")
                        
                    }

                    else if (field[1].type === "table") {

                        const rows = document.querySelectorAll(`${field[1].table_selector}`)

                        rows.forEach(row => {
                            let subfield = {}
                            for (const row_field of Object.entries(field[1].row_object_template)) {
                                subfield[row_field[0]] = row.querySelector(row_field[1]).innerText
                            }
                            record[field[0]].push(subfield)
                        })

                    }
                    else if (field[1].type === "form") {
                        
                        const rows = document.querySelectorAll(`${field[1].selector} tr`)

                        rows.forEach(row => {
                            
                            const key = row.querySelector("td:nth-child(1)").innerText.toLowerCase().replace(/\s/, "_")

                            record[key] = row.querySelector("td:nth-child(2)").innerText.replace(/\n/, " ")
                            
                            pageResults.push(record)
                        })
                    }

                }
                record.scrapedAt = new Date().toLocaleString()
                pageResults.push(record)
            }
            else {
                for (const item of rows) {
                    const record = {}

                    // This checks whether or not the info to be scraped is a single entry or a table to be scraped, as specified by the scrape template file.
                    for (const field of Object.entries(template)) {

                        if (field[1].type === "single_field") {

                            record[field[0]] = item.querySelector(field[1].selector).innerText
                            record[field[0]] = record[field[0]].replace(field[1].replace, "")
                            record.scrapedAt = new Date().toLocaleString()

                        }

                        else if (field[1].type === "table") {

                            const rows = item.querySelectorAll(`${field[1].table_selector}`)

                            rows.forEach(row => {
                                let subfield = {}
                                for (const row_field of Object.entries(field[1].row_object_template)) {
                                    subfield[row_field[0]] = row.querySelector(row_field[1]).innerText
                                }
                                record[field[0]].push(subfield)
                            })

                        }
                        else if (field[1].type === "form") {

                            const rows = item.querySelectorAll(`${field[1].selector} tr`)

                            rows.forEach(row => {
                                
                                const key = row.querySelector("td:nth-child(1)").innerText.toLowerCase().replace(/\s/, "_")
    
                                record[key] = row.querySelector("td:nth-child(2)").innerText.replace(/\n/, " ")
                                
                                pageResults.push(record)
                            })
                        }

                    }
                    record.scrapedAt = new Date().toLocaleString()
                    pageResults.push(record)
                }
            }


            return pageResults

        }, this.template, this.unit)

        return pageResults
    }

    async scrapeTable() {

    }

    // This is the logic behind how the Scrape class takes in the template, finds info on the page, and returns it.
    // async scrapeRecord(record_row, template) {

    //     const record = new Record()

    //     // This checks whether or not the info to be scraped is a single entry or a table to be scraped, as specified by the scrape template file.
    //     for (const field of Object.entries(template)) {

    //         if (field[1].type === "single_field") {

    //             record.result[field[0]] = record_row.querySelector(field[1].selector).innerText
    //             console.log(record.result[field[0]])
    //             record.result[field[0]] = record.result[field[0]].replace(field[1].replace, "")
    //             record.result.scrapedAt = new Date().toLocaleString()

    //         }

    //         else if (field[1].type === "table") {

    //             const rows = record_row.querySelectorAll(`${field[1].table_selector}`)

    //             rows.forEach(row => {
    //                 let subfield = {}
    //                 for (const row_field of Object.entries(field[1].row_object_template)) {
    //                     subfield[row_field[0]] = row.querySelector(row_field[1]).innerText
    //                 }
    //                 record.result[field[0]].push(subfield)
    //             })

    //         }

    //     }
    //     console.log(record)
    //     return record
    // }

};

module.exports = { Scrape }