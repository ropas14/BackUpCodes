var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const start_url = "https://www.goodrx.com/conditions";
var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];
let orgUrl = new URL(start_url);
const baseUrl = orgUrl.protocol + "//" + orgUrl.hostname;

let MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/"
var dbo = "";
// connecting to mongo
MongoClient.connect(mongourl, function(err, db) {
   if (err) {
      isfound = false;
      return;
   };
   dbo = db.db("goodrx");
});

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
   numPagesVisited++;
   visitPage(nextPage, crawl);

}

async function visitPage(url, callback) {
   // Add page to our set
   pagesVisited[url] = true;
   // Make the request
   console.log("Visiting page " + url);
   var requestPag = requestPage(url, callback);
   await requestPag.then(function(body) {
      var $ = cheerio.load(body);
      collectlinks($);
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
         }
         else {
            resolve(body);
         }
      })
   })
}

function collectlinks($) {
   let pageHeadings = $('h3.light-text.margin-bot-xl').text();
   let conditions = $('div.container-fluid.top-level:nth-of-type(4) div.row-fluid:nth-of-type(3) a');
   let tablepresent = $('table.table-sortable');

   if (pageHeadings != "") {  
      conditions.each(function() {
            var link = $(this).attr('href');
            if (link.startsWith("/")) {
               let conditionlink = baseUrl + link + "/drugs";
               console.log("............." + conditionlink)
               if (conditionlink in pagesVisited) {}
               else {
                  pagesToVisit.push(conditionlink);
               }
            }
            else {
               if (link in pagesVisited) {}
               else {
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
         }
         else {
            pagesToVisit.push(druglink);
         }

      });

   }

}

var drugItems;
var drugz = [];
var numItems = 0;

function scrapeItems($, url) {
   var conditioni = $('ul.breadcrumb li:nth-of-type(3) a span').text().trim();

   if (conditioni != "") {
      let dgtable = $('tbody.table-sortable-row');
      conditiony += conditioni;

      dgtable.each(function() {

         //drugy = $(this).find('div.text-truncate-td a span').text().trim();
         populariti = $(this).find('td.text-center.popularity div.meter').attr('title');
         descriptioni = $(this).find('tr:nth-child(2) td.light-text').text().trim();

         drugItems = {           
            popularity: populariti,
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
      let drugnames = $('div#configPanel div#drug ul.config-options li a');
      let drugi=$('div#configPanel div#drug[class*="-disabled"]').attr('selecteditem');
       if (doseg != "") {
         
            doseg.each(function() {
               let dosag = $(this).text().trim();
               dosagi.push(dosag);

            });

            var nextdrug = drugz.pop();         
            if(drugi!=""){
            nextdrug.drug=drugi;
            nextdrug.drugInfo = drugdesc;
            nextdrug.dosage = dosagi;
            drugDetail.push(nextdrug);
             console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
               console.log(nextdrug);
            }
            else{
               if(drugnames!=""){
             var count=0
               drugnames.each(function(){
               
               nextdrug.drug =$(this).getAttribute("slug");
               nextdrug.drugInfo = drugdesc;
               nextdrug.dosage = dosagi;
               drugDetail.push(nextdrug);
               count++
               console.log("+++++++++++ looping through brands, brand" + count);
               console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
               console.log(nextdrug);
               });
               }

             

            }
            dosagi = [];               

      }
      else {
         quantity.each(function() {
            let dos = $(this).text().trim();
            dosagi.push(dos);
         });
         var nxtdrug = drugz.pop();
          if(drugi!=""){
            nxtdrug.drug=drugi;
            nxtdrug.drugInfo = drugdesc;
            nxtdrug.dosage = dosagi;
            drugDetail.push(nxtdrug);
           console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
           console.log(nxtdrug);

            }
            else{
               drugnames.each(function(){
               nxtdrug.drug =$(this);
               nxtdrug.drugInfo = drugdesc;
               nxtdrug.dosage = dosagi;
               nxtdrug.push(nxtdrug);
               console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
               console.log(nxtdrug);
               });

            }
            dosagi = [];  

         drugDetail.push(nxtdrug);

      }
      if (drugz.length <= 0) {
         var items = {
            conditon: conditiony,
            drugs: drugDetail
         }
         numItems++
         dbo.collection("drugsandconditions").insertOne(items, function(err, res) {
            console.log("1 document inserted. " + numItems + " records in db");
         });

         conditiony = "";
         drugDetail = [];

      }

   }
   if (noPrescription != "") {
      var nextdrg = drugz.pop();
      nextdrg.drug = $('div#drugPanel h1.drug-name span a').text().trim();
      nextdrg.drugInfo = drugdesc;
      nextdrg.dosage = "";
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
      console.log(nextdrg);
      drugDetail.push(nextdrg);

      if (drugz.length <= 0) {
         var items = {
            conditon: conditiony,
            drugs: drugDetail
         }
         numItems++
         dbo.collection("drugsandconditions").insertOne(items, function(err, res) {
            console.log("1 document inserted. " + numItems + " records in db");
         });

         conditiony = "";
         drugDetail = [];

      }

   }

}