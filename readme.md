# Platescraper

An app that turns JSON scrape templates into the data you want, Platescraper is designed with three guiding principles in mind:
* You should be able to execute common scrape patterns with minimal duplicated effort.
* Those with only basic understanding of Javascript should be able to write scrape templates.
* Others should be able to see how the data was gathered **by viewing one JSON file**.

Platescraper is useful for one of three common scrape jobs:
* Scraping one page that contains all the data you need.
* Scraping many pages with unique urls but identical structure.
* Scraping tabular data from paginated web apps.

### Templates

Each template contains everything needed to run one of a few types of common scrape projects. New templates can be scaffolded properly using:

```npm run new --name TEMPLATENAME```

TEMPLATENAME should be replaced with the name of your template (ie. carsforsale).

Templates files contain a few common, required components:

        ```json

        {
            "pagination": {                         // This object stores information about pagination for field collection.
                "pages": 1,                         // Specify the number of pages to be scraped. You can also provide a CSS selector that will grab a number from that selector.
                "records_per_page": 50,             // Currently irrelevant.
                "next_page_button": ""              // Only used if pages > 1. Used to identify the button that advances the page.
            },
            "click_through": "",                    // The selector that will be clicked to retrieve the information in the template below. If empty, it will collect from the url.
            "unit": "body",                         // If "body", it is assumed one record per one url. If a selector is given, it will search each selector matching that criteria for the full template given below.
            "settings": {
                "speed": 3,                         // For single page searches through many URLs, this limits the number of async calls made at a time.
                "maximum_tries": 5,                 // The maximum number of times the scrape will restart if it errors out.
                "puppeteerOptions": {
                    "headless": false,              // Run puppeteer in headless more or not.
                    "slowMo": 0,                    // Slows script execution down by this many milliseconds. Useful for debugging.
                    "defaultViewport": null         // Standard viewport size in headful mode.
                }
            },
            "template": {                           // This template, with the exception of "form" type elements, will define exactly how the output JSON will look.
                "field1": {                         // Replace field1 with what you want this property to be named.
                    "type": "single_field",         // REQUIRED: Type can be "single_field", "table", or "form". Each is described here. Single fields are simple infomation taken from one selector.
                    "selector": "",                 // REQUIRED: The selector that holds this data.
                    "regex_match": ".*(?=,)",       // OPTIONAL: Specify regex that will be used to call .match(). Useful for isolating particular bits of text in the same selector for different fields.
                    "grab": "text"                  // OPTIONAL: Grab can be "text", "href", or "value". Determines what is taken from the element. Default is text. Value useful for scraping input boxes.
                },
                "field2": {
                    "type": "single_field",
                    "selector": "",
                    "replace": "",                  // OPTIONAL: A string that will be passed through .replace() for this field. Useful for cleaning the data.
                },
                "field3": "",                       // Single fields can also be written as a string with the selector. Objects only need to be passed if you need access to their properties.
                "field4": {
                    "type": "table",                // REQUIRED: Table types require some extra information. The table will return an array with each row in the table as subfield objects.
                    "row_selector": "",             // REQUIRED: The selector that corresponds to each row in the table. Should be relative to "unit".
                    "row_object_template": {        // REQUIRED: Defines how each subfield will look.
                        "subfield1": "",            // REQUIRED: Each subfield acts like a field template object.
                        "subfield2": "",            // You can specify a selector only...
                        "subfield3": {
                            "selector": "",         // REQUIRED (if passing object): ...or pass an object with selector, regex_match, and replace properties. Each functions like the same field property.
                            "regex_match": "",      // OPTIONAL
                            "replace": "\n"         // OPTIONAL
                        },
                    }
                },
                "name_irrelevant": {                // Form types will not return the name of the field, so it is irrelevant what this field is named.
                    "type": "form",                 // This type will go through two column tables, with the first cell containing the field name, and the second the value. It will add each to the record as though it were
                    "selector": ""                  // collected using a single_field type.
                }
            },
            "urls": [                               // The urls to be iterated through for the scrape. In scrapes with pagination, this will be one url. In scrapes where there is one record returned per page, there will be
                ""                                  // several.
            ]
        }
        ```

        * *replace*: Specify text you'd like platescraper to replace for you in this field.
        * *selector*: The selector that is chosen. Should be relative to the unit specified.
        * *table_selector*: Should represent each row in your table, whether they be divs, trs, or lis.
    * *urls*: A list of urls in string format. When the scrape is executed, each url will be visited and the same scrape operation will be run. In the case of one website where pagination is used and is not controlled through the url (ie. .NET apps), there should be a list of one url specified here.


### Project to-dos
* Implement error handling for poorly formatted templates.