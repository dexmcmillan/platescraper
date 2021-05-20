#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs')

const blanktemplate = {
    "pagination": {
        "pages": 1,
        "next_page_button": ""
    },
    "click_through": "",
    "unit": "body",
    "settings": {
        "speed": 3,
        "maximum_tries": 5,
        "puppeteerOptions": {
            "headless": false,
            "slowMo": 0,
            "defaultViewport": null
        }
    },
    "template": {
        "field1": "",
        "field2": {
            "type": "single_field",
            "selector": ""
        },
        "field3": {
            "type": "table",
            "selector": "",
            "template": {
                "subfield1": "",
                "subfield2": "",
                "subfield3": {
                    "selector": "td:nth-child(1)",
                    "regex_match": ".*(?=\n)",
                    "replace": "\n"
                },
            }
        },
        "name_irrelevant": {
            "type": "form",
            "selector": ""
        }
    },
    "urls": [
        ""
    ]
}

try {
    if (argv.name !== undefined) {
        fs.writeFileSync(`./templates/${argv.name}.json`, JSON.stringify(blanktemplate))
    }
    else {
        console.error("ERROR: No name given. Please specify a name for your template using --name FILENAME.") 
    }
}
catch {
    console.log("wrong command bud!")
}

