# Template Scrape

An app that turns scrape templates into data. Based off the puppeteer browser automation library. It's designed with speed and clarity in mind, so those with minimal understanding of javascript can follow the logic of scrapes and see how the scraped data was constructed by viewing one JSON file.

Often a team of people will want to collaborate on a scrape to determine the best structure for the resulting data. This app hopes to solve that problem.

The scrape iterates through a list of urls given and runs Scrape.scrapePage(), which collects data and structures it according to the specified template file.

### Getting started

```
npm install
```

Create a new blank template.

```
npm run new --name NAMEHERE
```

### Templates

New templates can scaffolded properly using:

```npm run new --name TEMPLATENAME``

TEMPLATENAME should be replaced with the name of your template (ie. carsforsale).

Templates files contain a few common, required components:
* *template_name*: The template name should be the same as your file name and is what's used to identify the template for use in a scrape.
* *pages*: Often, scraping data requires code to click through pagination. Specifies the number of pages that you want to go through.
* *next_page_button*: The CSS selector corresponding to the button that will be clicked in between scrapes of each page. Only required if pages > 1.
* *unit*: Unit is a CSS selector corresponding to the element in the DOM that holds each separate record you want to scrape. In the case of data where a single page is a record, an empty string or "page" should be specified here.
* *settings*: The settings object specifies a number of options for the scrape.
    * *speed*: This app makes asynchronous calls to the urls listed in each template. To ensure you don't cause problems, the async requests are made in groups, where speed is the number of URLs in each group. This number should be kept somewhere between 1-10 so as to keep demands on memory and outside servers low.
    * *maximum_tries*: The number of times the scraper will try to scrape each page. If it errors out more times than this number, it will skip that page and will not record it.
    * *save_as*: The name of the output file. Should always be appended with .json.
    * *puppeteer_options*: 
        * *headless*: Boolean that tells Puppeteer to run in either headless (no GUI) or headful mode. Headful mode is useful for debugging.
        * *slowMo*: Slow your code down a bit if you're running intense scraping operations. Specify number in milliseconds.
        * *defaultViewport*: Set the size of the viewport when running Puppeteer in headful mode.
    * *template*: Here's where the magic happens. Each property in this object will represent a property in the output JSON file. Each property contains:
        * *type*: Either single_field or table. Table will iterate through a table in your unit while single_field will grab the text of a one DOM object.

        ```javascript

        // single_field object.
        "name": {
            "type": "single_field",
            "selector": "strong span:nth-child(2)"
        }

        // table object.
        "specialties": {
            "type": "table",
            "table_selector": "#specialties > table:nth-child(2) > tbody > tr",
            "row_object_template": {
                "specialty": "td:nth-child(1)",
                "issued_on": "td:nth-child(2)",
                "type": "td:nth-child(3)"
            }
        }
        ```

        * *selector*: The selector that is chosen. Should be relative to the unit specified.
        * *table_selector*: Should represent each row in your table, whether they be divs, trs, or lis.
    * *urls*: A list of URLS. When the scrape is executed, each URL will be visited and the same scrape operation will be run. In the case of one website where pagination is used and is not controlled through the URL (ie. .NET apps), there should be a list of one URL specified here.
