const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs')

const blanktemplate = {
    "template_name": argv.name,
    "next_page_button": "span.pull-right:nth-child(2) > ul:nth-child(1) > li:nth-child(6) > a:nth-child(1)",
    "unit": "page",
    "settings": {
        "speed": 3,
        "maximum_tries": 5,
        "saveAs": "data.json",
        "puppeteerOptions": {
            "headless": false,
            "slowMo": 0,
            "defaultViewport": null
        }
    },
    "template": {
        "FIELD1": {
            "type": "single_field",
            "selector": "",
            "replace": ""
        },
        "FIELD2": {
            "type": "single_field",
            "selector": "",
            "replace": ""
        },
        "FIELD3": {
            "type": "single_field",
            "selector": "",
            "replace": ""
        },
        "FIELD4": {
            "type": "table",
            "table_selector": "",
            "row_object_template": {
                "SUBFIELD": "",
                "SUBFIELD": "",
                "SUBFIELD": ""
            }
        }
    },
    "urls": [
        
    ]
    
}

if (argv.name !== undefined) {
    fs.writeFileSync(`./templates/${argv.name}.json`, JSON.stringify(blanktemplate))
}
else {
    console.error("ERROR: No name given. Please specify a name for your template using --name FILENAME.") 
}
