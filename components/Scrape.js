const p = require('puppeteer')
const _ = require('lodash')
const fs = require('fs')
const { reject } = require('lodash')

class Scrape {

    results = []

    // Urls will be loaded into here on object construction.
    urlParams = []
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
    records_selector;
    pages_to_scrape;
    start_time;
    end_time;
    duration;

    constructor(templateName) {

        let template = JSON.parse(fs.readFileSync(`./templates/${templateName}.json`).toString())

        console.log(template)

        this.template_name = templateName
        this.template = template.template
        this.maximum_tries = template.settings.maximum_tries
        this.speed = template.settings.speed

        if (template.urls.start !== undefined) {
            this.urlParams = template.urls
        } else if (typeof template.urls === "string") {
            this.urlList = [template.urls]
        }
        else {
            this.urlList = template.urls
        }

        this.puppeteerOptions = template.settings.puppeteerOptions
        this.pages = template.pagination.pages
        this.next_page_button = template.pagination.next_page_button
        this.unit = template.unit
        this.pages = template.pagination.pages
        this.records_per_page = template.pagination.records_per_page

        if (this.unit === undefined || this.unit === "") {
            this.unit = "body"
        }

        this.click_through = template.click_through

        this.save_as = `./output/${templateName.replace("template", "data")}.json`
        this.save_stream = fs.createWriteStream(`${this.save_as}`)

        this.start_time = new Date().toLocaleString()
        console.log(`New scrape started at ${this.start_time}\nBased on template: ${this.template_name}.`)
        

        return this
    }

    // This method is one of the primary methods for scraping pages.
    // It takes an array of urls and goes through each of them asynchronously (with limits) to grab information.
    async run(urls = this.urlList) {
        
        return new Promise(async (resolve) => {

            if (this.urlList.length === 0) {
                await this.urls(this.urlParams.start, this.urlParams.selector)
            }

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
                    const promise = new Promise(async (resolve, reject) => {
                        while (timesFailed < this.maximum_tries) {

                            

                            const page = await browser.newPage();
                            await page.exposeFunction('getRecord', this.getRecord);

                            await Promise.all([
                                page.goto(url),
                                page.waitForNavigation({ waitUntil: "networkidle0" })
                            ])

                            await this.customCode(page)

                            try {

                                if (typeof this.pages === "string") {
                                    this.pages = await page.$eval(this.pages, el => el.innerText)
                                    
                                } else if (typeof this.pages === "number") {
                                    this.pages = this.pages
                                }

                                for (let pageNum = 1; pageNum <= this.pages; pageNum++) {

                                    await this.scrapePage(page)

                                    if (this.pages > 1 && pageNum !== this.pages) {
                                        try {
                                            await Promise.all([
                                                page.click(this.next_page_button),
                                                page.waitForNavigation({ waitUntil: "networkidle0", timeout: 3000 })
                                            ])
                                        } catch {
                                        }

                                    }
                                    
                                    
                                }
                                
                                page.close()
                                return resolve(JSON.stringify(this.results))
                            } catch (err) {
                                console.log(err)
                                await page.close()
                                timesFailed++
                                console.log(`Times failed: ${timesFailed}.`)
                                reject("ERROR: Scrape failed too many times.")
                            }

                        }
                    }).catch(error => console.log(error))

                    promises.push(promise)

                })

                await Promise.all(promises)

            }
            browser.close()

            const stringifiedResults = JSON.stringify(this.results)
            this.save_stream.write(stringifiedResults)

            this.end_time = new Date()
            this.duration = Math.round(((this.end_time - this.start_time)/1000),1)

            
            return resolve(this.results)
        })
    }

    async urls(url, selector=this.urlParams.selector) {

        console.log(`Grabbing urls from: ${this.urlParams.start}...`)

        // New puppeteer browser instance.
        const browser = await p.launch(this.puppeteerOptions);
        const page = await browser.newPage();

        page.on('console', consoleObj => console.log(`CONSOLE MESSAGE: ${consoleObj.text()}`));

        await Promise.all([
            page.goto(url),
            page.waitForNavigation({ waitUntil: "networkidle0" })
        ])

        await this.customUrlCode(page)

        for (let pageNum = 1; pageNum <= this.urlParams.pages; pageNum++) {

            if (this.urlParams.pages > 1) {
                await Promise.all([
                    page.click(this.urlParams.next_page_button),
                    page.waitForNavigation({ waitUntil: "networkidle0" ,timeout: 10000})
                ])
            }
            

            const urls = await page.$$eval(`${selector}`, array => {
                console.log(array.length)
                return array.map(row => row.href)
            })

            await urls.forEach(item => this.urlList.push(item))
        }

        browser.close()
        console.log(`Found ${this.urlList.length} urls.`)
        return this.urlList

    }

    async getRecord(page, item = page) {

        let record = {}

        // This checks whether or not the info to be scraped is a single entry, a table, or a form-style table to be scraped, as specified by the scrape template file.
        for (const field of Object.entries(this.template)) {

            if (field[1].type === "single_field" || field[1].type === undefined) {
                let selector = field[1]
                let to_replace = undefined
                let grab = undefined
                let regexp = undefined

                if (field[1].regex_match !== undefined) {
                    regexp = new RegExp(field[1].regex_match, 'i');
                }
                else {
                    regexp = /[\s\S]*/i
                }

                if (typeof field[1] === "object") {
                    selector = field[1].selector
                    to_replace = field[1].replace
                    grab = field[1].grab
                }

                if (grab === "text" || grab === undefined) {
                    record[field[0]] = await item.$eval(`${selector}`, el => el.innerText)
                        .then(res => res.match(regexp)[0].replace(to_replace, ""))
                        .catch(err => console.log(err))
                } else if (grab === "value") {
                    record[field[0]] = await item.$eval(`${selector}`, el => el.value)
                        .then(res => res.match(regexp)[0].replace(to_replace, ""))
                        .catch(err => console.log(err))
                } else if (grab === "href") {
                    record[field[0]] = await item.$eval(`${selector}`, el => el.href)
                }
                    
            }



            else if (field[1].type === "table") {

                let rows = await page.$$(`${field[1].selector}`)

                record[field[0]] = []

                for (const row of rows) {
                    let subfield = {}
                    try {
                        
                        for (const row_field of Object.entries(field[1].template)) {

    
                            let selector = row_field[1]
                            let to_replace = undefined
                            let grab = undefined
                            
                            if (row_field[1].regex_match !== undefined) {
                                var row_regexp = new RegExp(row_field[1].regex_match, 'i');
                            }
                            else {
                                row_regexp = /.*/i
                            }
                            
                            if (typeof row_field[1] === "object") {
                                selector = row_field[1].selector
                                to_replace = row_field[1].replace
                                grab = row_field[1].grab
                                
                            }

    
                            
                            if (grab === "text" || grab === undefined) {
                                subfield[row_field[0]] = await row.$eval(selector, el => el.innerText)
                                subfield[row_field[0]] = subfield[row_field[0]].match(row_regexp)[0].replace(to_replace, "")
                            } else if (grab === "value") {
                                subfield[row_field[0]] = await row.$eval(selector, el => el.value)
                                subfield[row_field[0]] = subfield[row_field[0]].match(row_regexp)[0].replace(to_replace, "")
                            } else if (grab === "href") {
                                subfield[row_field[0]] = await row.$eval(selector, el => el.href)
                            }
                             
                        }
                        record[field[0]].push(subfield)
                    } catch(err) {
                        console.log(err)
                        // Probably a table that exists but is empty.
                    }
                    

                }
            }
            else if (field[1].type === "form") {

                const rows = await page.$$(`${field[1].selector} tr`)
                const spaceReplace = /\s/gi
                const replace = /[\t]/gi

                for (const row of rows) {

                    try {
                        if (field[1].grab === "text" || field[1].grab === undefined) {
                            var key = await row.$eval("td:nth-of-type(1)", el => el.innerText)
                            key = key.toLowerCase().replace(spaceReplace, "_")
                            record[key] = await row.$eval("td:nth-of-type(2)", el => el.innerText)
                        } else if (field[1].grab === "value") {
                            var key = await row.$eval("td:nth-of-type(1)", el => el.innerText)
                            key = key.toLowerCase().replace(spaceReplace, "_")
                            record[key] = await row.$eval("td:nth-of-type(2) input", el => el.value)
                        } else if (field[1].grab === "href") {
                            var key = await row.$eval("td:nth-of-type(1)", el => el.innerText)
                            key = key.toLowerCase().replace(spaceReplace, "_")
                            record[key] = await row.$eval("td:nth-of-type(2) *", el => el.href)
                        }
                        record[key] = record[key].replace(replace, " ")
                    } catch(err) {
                        console.log(err)
                    }

                    
                    


                }

            }


        }
        record.scrapedAt = new Date().toLocaleString()
        console.log(record)
        return record
    }

    async scrapePage(page) {

        if (this.click_through !== undefined) {

            let units = await page.$$(`${this.unit} ${this.click_through}`)

            for (let i = 1; i < units.length; i++) {

                try {
                    await Promise.all([
                        page.click(`${this.unit}:nth-child(${i}) ${this.click_through}`),
                        page.waitForNavigation({ waitUntil: "networkidle0" })
                    ])

                    var record = await this.getRecord(page)
                        .catch(error => console.log(error))
                    
                     this.results.push(record)
                     console.log(`Found ${this.results.length} records...`)
    
                    await Promise.all([
                        page.goBack(),
                        page.waitForNavigation({ waitUntil: "networkidle0" })
                    ])
    
                    units = await page.$$(`${this.unit} ${this.click_through}`)
                } catch (err) {
                    console.log(err)
                    // Probably hit a header row in whatever table you're looking at.
                }
                
                
            }

        } else {

            let rows = await page.$$(`${this.unit}`)

            for (const item of rows) {
                var record = await this.getRecord(page, item)
                await this.results.push(record)
                console.log(`Found ${this.results.length} records...`)
            }

            

        }

    }

    async customCode() {
        // Custom code to start the run() scrape goes here...
        console.log("No custom code to run.")

    }

    async customUrlCode() {
        // Custom code to start the url() scrape goes here...
        console.log("No custom code to run for url scraping.")

    }

    static async error(code) {
        const errors = await JSON.parse(fs.readFileSync('./errors.json').toString())
        console.log(`ERROR: ${errors[code]} (CODE: ${code})`)
    }

};

module.exports = { Scrape }