var config = require("./config");
var express = require('express');
var request = require('request');
var youtube = require('youtube-api');
youtube.authenticate({
  type: "key",
  key: config.youtube.apikey
});
var parseString = require('xml2js').parseString;
var app = express();

function getAllSubscriptions(channel, pagetoken) {
  youtube.subscriptions.list({
    "part": "snippet",
    "channelId": channel,
    "maxResults": "50",
    "pageToken": pagetoken
  }, function (err, data) {
    if(typeof data.nextPageToken != 'undefined'){
      getAllSubscriptions(channel,data.nextPageToken);
    }

    var videos = [];

    data.items.forEach(function(entry) {
      request("https://www.youtube.com/feeds/videos.xml?channel_id=" + entry.snippet.resourceId.channelId,
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
            parseString(body, function (err, result) {
              videos[videos.length] = result.feed.entry;
            });
          }
          console.log(videos);
        });
    });


    //console.log(err || data);
  });
}

// Views path
app.set('views', './views');
// Set template-engine to ejs
app.set('view engine', 'ejs');
// Initiate html engine
app.engine('html', require('ejs').renderFile);

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/search/:phrase', function (req, res) {
  getAllSubscriptions(req.params.phrase);

/*  request('http://ip.goldclone.no', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body); // Show the HTML for the Google homepage.
    }

  })*/
  res.send('Something');
  //console.log(request("https://www.googleapis.com/youtube/v3/subscriptions?part=part=snippet&channelId=%s&key=%s",req.params.phrase,config.youtube.apikey));
});

//
//GET https://www.googleapis.com/youtube/v3/subscriptions?part=id%2C+snippet%2C+contentDetails&channelId=UChJRyNlaSpSBUhPLgqdSCzQ&key={YOUR_API_KEY}
//GET https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&channelId=UChJRyNlaSpSBUhPLgqdSCzQ&maxResults=50&key={YOUR_API_KEY}
//https://www.youtube.com/feeds/videos.xml?channel_id=

app.use(function(req, res) {
    res.status(404).send('Not found');
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
