const { Scrape } = require('./components/Scrape.js')

const lobbyScrape = new Scrape("lobbying")

const url = "https://www.princeedwardisland.ca/en/feature/lobbyist-registry#/service/Lobbyist/Lobbyist;lobbyist_name=null;company=null;client=null;target=null;lobbyist_type=null;status=1;wdf_url_query=true;sid=null;page_num=1;page_count=1;finished=0"
const selector = ".table > tbody:nth-child(2) > tr > td:nth-child(1) > a:nth-child(1)"

lobbyScrape.urls(url, selector)
    .then(res => {
        return lobbyScrape.run(res)
    })
    .then(res => {
        console.log(res)
        lobbyScrape.save_stream.write(res)
    })
    .catch()



