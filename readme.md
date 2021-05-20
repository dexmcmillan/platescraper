# Platescraper

***Platescraper turns JSON scrape templates into the data you want.***

Platescraper is designed with three guiding principles in mind:

* You should be able to execute common scrape patterns with minimal duplicated effort.
* Those with only basic understanding of Javascript should be able to write scrape templates.
* Others should be able to see how the data is gathered **by viewing only one JSON file**.

Platescraper is useful for one of three common scrape jobs:

* Scraping one page that contains all the data you need.
* Scraping many pages with unique urls but identical structure.
* Scraping tabular data from paginated web apps.

## The template file

Each template file contains all the information needed to understand the general logic of the scrape, except for one critical piece (explained below).

### settings
*accepts*: object

*required?*: yes

The settings object contains information that controls overall behaviour of the scrape, including options that are passed to Puppeteer.

```json
"settings": {
    "speed": 3,                         // For single page searches through many URLs, this limits the number of async calls made at a time.
    "maximum_tries": 5,                 // The maximum number of times the scrape will restart if it errors out.
    "puppeteerOptions": {
        "headless": false,              // Run puppeteer in headless more or not.
        "slowMo": 0,                    // Slows script execution down by this many milliseconds. Useful for debugging.
        "defaultViewport": null         // Standard viewport size in headful mode.
    }
}
```

### pagination
*accepts*: object

*required?*: yes

The pagination object contains information about how many pages your records will be scraped from. It contains two fields:

```json
"pagination": {
    "pages": 1,                 // Specifies the number of pages platescraper should cycle through.
    "next_page_button": ""      // Specifies the css selector of the button that should be clicked to advance the page.
}
```

### unit
*accepts*: css selector

*required?*: no

The unit property will default to "body" unless another css selector is passed. This specifies the highest-level unit from which all the information for one record is contained.

For example, in tables where each row contains all the information required for one record, the unit may be "table > tbody > tr". For situations where there is one record per page, the unit should be "body".

### click_through
*accepts*: css selector

*required?*: no

If click_through is specified, each record will not be found on the original url that is navigated to, but instead from a page that is reached by clicking on this selector. This selector should be relative to the unit specified. Platescraper will then iterate through those links and gather information based on your template from the next page.

### template
*accepts*: object

*required?*: yes

The heart of a platescraper template file. This specifies how each record in your final JSON output will look, as well as where and how platescraper should look for each field of your record.

There are three types of fields:
* single_field (string or field object): Can be passed a string with the css selector corresponding to a single value. Or, a field object can be passed with further specifications.

```json
"field1": {                         // Replace field1 with what you want this property to be named.
    "type": "single_field",         // Type can be "single_field", "table", or "form". Each is described here. Single fields are simple infomation taken from one selector.
    "selector": "",                 // The selector that holds this data.
    "regex_match": ".*(?=,)",       // Specify regex that will be used to call .match(). Useful for isolating particular bits of text in the same selector for different fields.
    "grab": "text"                  // Grab can be "text", "href", or "value". Determines what is taken from the element. Default is text. Value useful for scraping input boxes.
}
```

* table: For scraping all rows from a table and dropping them into an array in this field.

```json
"field4": {
        "type": "table",                // REQUIRED: Table types require some extra information. The table will return an array with each row in the table as subfield objects.
        "selector": "",                 // REQUIRED: The selector that corresponds to each row in the table. Should be relative to "unit".
        "template": {                   // REQUIRED: Defines how each subfield will look.
            "subfield1": "",            // REQUIRED: Each subfield acts like a field template object. subfield1 etc should be replaced with whatever you'd like the name of the field to be.
            "subfield2": "",            // You can specify a selector only...
            "subfield3": {              // ...or pass an object with required selector and optional regex_match and replace properties. Each functions like the same field property.
                "selector": "",         
                "regex_match": "",      
            },
        }
    },
```

* form: This type is for convenience, and is the only type that will not exactly match your outputted json. Instead, form types will take each entry in a two column table, using the first column as the key and the second column as the value. It will push each row as a new field in your output JSON. It exists to make a common type of scrape easier and faster to complete.

```json
"name_irrelevant": {                    // Form types will not return the name of the field, so it is irrelevant what this field is named.
    "type": "form",                     // This type will go through two column tables, with the first cell containing the field name, and the second the value. It will add each to the record as though it were
    "selector": "table > tbody"         // collected using a single_field type.
}
```

### urls
*accepts*: object or string

*required?*: yes

If a simple url string is passed, the scraper will use it as a starting point to handle pagination. If an array is passed, it will loop through each and collect records according to the template above (this is common if you have several pages that all have the same structure and all contain one record).

A urls object can also be passed, which specifies how urls should be collected before being iterated through by the scrape.

```json
"urls": {
    "start": "",                        // The url where the scrape should start collecting urls from.
    "pages": 1,                         // How many pages the urls are contained within.
    "next_page_button": "",             // If they are contained in more than one page, this css selector corresponds to the "next page" button.
    "selector": "a"                     // A css selector coresponding to each link that is to be grabbed. Should be relative to the unit property of your template file.
}
```

# Project to-dos
* Implement error handling for poorly formatted templates.