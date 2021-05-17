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

### What's in a template?

Text here about templates.