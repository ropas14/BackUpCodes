var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const start_url = "https://www.goodrx.com/conditions";
var pagesVisited = {};
var pagesToVisit = [];
// variables for multiple branded drugs
var visitUrlbrand = [];
var brandstoVisited = {};

let orgUrl = new URL(start_url);
const baseUrl = orgUrl.protocol + "//" + orgUrl.hostname;
var thepath;

let MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/"
var dbo = "";
// connecting to mongo
/*MongoClient.connect(mongourl, function(err, db) {
    if (err) {
        isfound = false;
        return;
    };
    dbo = db.db("goodrx");
});*/

// variable items
var drugy = "";
var descriptioni = "";
var dosagi = [];
var conditiony = "";

var drugDetail = [];

pagesToVisit.push(start_url);
crawl();

function crawl() {
    if (pagesToVisit.length <= 0) {
        console.log('Max visits reached');

        return;
    }
    var nextPage = pagesToVisit.pop();
    // New page we haven't visited
    if (nextPage == null) {
        return;
    }
    visitPage(nextPage, crawl);

}

async function visitPage(url, callback) {
    // Add page to pagesVisited set
    pagesVisited[url] = true;
    // Make the request
    console.log("Visiting page " + url);
    var requestPag = requestPage(url, callback);
    await requestPag.then(function(body) {
        var $ = cheerio.load(body);
        collectlinks($, url);
        scrapeItems($, url);
        callback();
    }, function(err) {
        console.log(err);
        callback();
    })
}

function requestPage(url, callback) {
    var options = {
        url: url,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
        }
    };
    return new Promise(function(resolve, reject) {
        // Do async job
        request.get(options, function(err, resp, body) {
            if (err) {
                reject(err);
                callback();
            } else {
                resolve(body);
            }
        })
    })
}

function collectlinks($, url) {
    let pageHeadings = $('h3.light-text.margin-bot-xl').text();
    let conditions = $('div.container-fluid.top-level:nth-of-type(4) div.row-fluid:nth-of-type(3) a');
    let tablepresent = $('table.table-sortable');

    let drgPanel = $('div#configPanel');

    if (pageHeadings != "") {
        conditions.each(function() {
            var link = $(this).attr('href');
            if (link.startsWith("/")) {
                let conditionlink = baseUrl + link + "/drugs";
                console.log("............." + conditionlink)
                if (conditionlink in pagesVisited) {} else {
                    pagesToVisit.push(conditionlink);
                }
            } else {
                if (link in pagesVisited) {} else {
                    pagesToVisit.push(link + "/drugs");
                }
            }
        });

    }

    if (tablepresent != "") {
        let drugsTable = $('tbody.table-sortable-row');

        drugsTable.each(function() {

            var druglink = $(this).find('td div.text-truncate-td a').attr('href');

            if (druglink.startsWith("/")) {
                let drglink = baseUrl + druglink;
                pagesToVisit.push(drglink);
            } else {
                pagesToVisit.push(druglink);
            }

        });

    }
    // quering the url of a drug brand name
    if (drgPanel) {
        console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee?????????????????????????????????????? we are here")
        let drugi = $('div#configPanel div#drug[class*="-disabled"]').text().trim();
          console.log('=='+drugi);
        if (drugi) {
           }else{
          console.log("in the loop ###########################################################################")
            let drugnames = $('div#configPanel div#drug ul.config-options li ');
            var strings = url.split('/');
            var theDrg = strings[strings.length-1];
            drugnames.each(function() {

                let drgbrands = $(this).find('a').attr('slug');
                let dg, brnd;
                let dsg = $('div#configPanel div#dosage').attr('selecteditem');
                let qnty = $('div#configPanel  div#quantity').attr('selecteditem');
                dg = theDrg;
                brnd = drgbrands;
                if (dg.indexOf(" ") > 1 || dsg.indexOf(" ") > 1 || drgbrands.indexOf(" ") > 1) {
                    dg = dg.split(" ").join("-");
                    brnd = drgbrands.split(" ").join("-");
                    dsg = dsg.split(" ").join("-");

                }
                if (dg.indexOf("'") > 1 || dsg.indexOf("'") > 1 || drgbrands.indexOf("'") > 1) {
                    dg = dg.split("'").join("-");
                    brnd = drgbrands.split("'").join("-");
                    dsg = dsg.split("'").join("-");
                }
                if (dg.indexOf("/") > 1 || dsg.indexOf("/") > 1 || drgbrands.indexOf("/") > 1) {
                    dg = dg.split("/").join("-");
                    brnd = drgbrands.split("/").join("-");
                    dsg = dsg.split("/").join("-");
                }


                //url query for various drug names of a certain drug
                //https://www.goodrx.com/zazole?drug-name=zazole&form=tablet&dosage=45g-of-0.4%25&quantity1&days_supply=&label_override=terazol-3
                let nmeUrl = baseUrl + "/" + dg + "?drug-name=" + dg + "&form=tablet&dosage=" + dsg + "&quantity" + qnty + "&days_supply=&label_override=" + brnd;
                console.log(nmeUrl);
                pagesToVisit.push(nmeUrl);
            });

        }
    }
}

var drugItems;
var drugz = [];
var numItems = 0;

var variousNames;
var otherDoses = [];

function scrapeItems($, url) {
    var conditioni = $('ul.breadcrumb li:nth-of-type(3) a span').text().trim();

    /*check if we are on the condition page with multiple drugs  eg
       https://www.goodrx.com/parkinson-s-disease/drugs*/

    if (conditioni != "") {
        let dgtable = $('tbody.table-sortable-row');
        conditiony += conditioni;

        dgtable.each(function() {

            drugy = $(this).find('div.text-truncate-td a span').text().trim();
            populariti = $(this).find('td.text-center.popularity div.rank-value').text().trim();
            descriptioni = $(this).find('tr:nth-child(2) td.light-text').text().trim();

            drugItems = {
                drug: drugy,
                popularit_rank: populariti,
                description: descriptioni
            };
            drugz.push(drugItems);

        });

        console.log(conditioni + " has a total of " + drugz.length + " recommended drugs");
    }

    let dosagy = $('div#configPanel');
    //let dosagedisabled = $('div#configPanel  div#dosage[class*="-disabled"]');
    let quantity = $('div#configPanel  div#quantity ul li a');
    let drugdesc = $('div.long-druginfo').text().trim();
    let noPrescription = $('div.drug-footer.-otc');

        if (dosagy != "") {
            let doseg = $('div#configPanel div#dosage ul li a');
            if (url.includes("override")) {
                 console.log("*************************** loading brandname")
        let doseg = $('div#configPanel div#dosage ul li a')
        if (doseg) {
            // get dosages for the page
            doseg.each(function() {
                let dosag = $(this).text().trim();
                otherDoses.push(dosag);
            });

            variousNames.drug = $(this).find('a').text();
            variousNames.dosage = otherDoses;
            console.log(variousNames);
            var itemsdg = {
                drug: drugy,
                names: variousNames
            }

            // saving the name details to a database
            /*dbo.collection("drugbrands").insertOne(itemsdg, function(err, res) {
                console.log("1 document inserted for " + itemsdg.drugy);
            });*/
            otherDoses = [];
        }
            }
        /*check to if we are on the drug page */
            //check  if the dosage div exists
            else{
                if (doseg != "") {
                doseg.each(function() {
                    let dosag = $(this).text().trim();
                    dosagi.push(dosag);
                });

                var nextdrug = drugz.pop();
                nextdrug.drugInfo = drugdesc;
                nextdrug.dosage = dosagi;
                nextdrug.country = "US";
                drugDetail.push(nextdrug);
                console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                console.log(nextdrug);
                dosagi = [];

            } else {
                quantity.each(function() {
                    let dos = $(this).text().trim();
                    dosagi.push(dos);
                });
                var nxtdrug = drugz.pop();
                nxtdrug.drugInfo = drugdesc;
                nxtdrug.dosage = dosagi;
                nxtdrug.country = "US";
                drugDetail.push(nxtdrug);
                console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>quantity as dosage");
                console.log(nxtdrug);
                dosagi = [];

            }

            // saving condition and its drug arrays to mongo
            if (drugz.length <= 0) {
                var items = {
                    conditon: conditiony,
                    drugs: drugDetail
                }
                numItems++
                /* dbo.collection("drugs&conditions").insertOne(items, function(err, res) {
                     console.log("1 document inserted. " + numItems + " records in db");
                 });*/

                conditiony = "";
                drugDetail = [];

            }

        }
            }
            
            
        //check if there is no data of drug dosages and quantity

        if (noPrescription != "") {
            var nextdrg = drugz.pop();
            //nextdrg.drug = $('div#drugPanel h1.drug-name span a').text().trim();
            nextdrg.drugInfo = drugdesc;
            nextdrg.dosage = "";
            nextdrg.country = "US"
            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>noprescription");
            console.log(nextdrg);
            drugDetail.push(nextdrg);

            if (drugz.length <= 0) {
                var items = {
                    conditon: conditiony,
                    drugs: drugDetail
                }
                numItems++
                /* dbo.collection("drugsandconditions").insertOne(items, function(err, res) {
                     console.log("1 document inserted. " + numItems + " records in db");
                 });*/
                console.log("The Saving part");
                conditiony = ""; // clearing
                drugDetail = []; // clearing drugDetail array

            }

        }
   

}
