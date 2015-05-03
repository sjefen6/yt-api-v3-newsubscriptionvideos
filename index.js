var config = require("./config");
var express = require('express');
var request = require('request');
var youtube = require('youtube-api');
youtube.authenticate({
  type: "key",
  key: config.youtube.apikey
});
var xml2js = require('xml2js');
var parseString = new xml2js.Parser({
  explicitArray: false
}).parseString;
var app = express();

function getAllSubscriptions(channel, cb, pagetoken, context) {
  youtube.subscriptions.list({
    part: "snippet",
    channelId: channel,
    maxResults: 50,
    pageToken: pagetoken
  }, function (err, data) {
    if (context === undefined) {
      context = {
        videos: [],
        total: data.items.length,
        done: 0
      };
    } else {
      context.total += data.items.length;
    }

    if(data.nextPageToken !== undefined){
      getAllSubscriptions(channel, cb, data.nextPageToken, context);
    }

    data.items.forEach(function(entry) {
      request("https://www.youtube.com/feeds/videos.xml?channel_id=" + entry.snippet.resourceId.channelId,
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
            parseString(body, function (err, result) {
              context.videos.push.apply(context.videos, result.feed.entry);
            });
          }

          context.done++;
          if (context.done === context.total) {
            cb(context.videos);
          }
        });
    });
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

app.post('/', function (req, res) {
  //res.redirect('/search/' + req.params.phrase);
  res.send(JSON.stringify(req.params) +
  JSON.stringify(req.body) +
  JSON.stringify(req.query));
  //res.render('index');
});

app.get('/search/:phrase', function (req, res) {
  console.log("Incoming!");
  getAllSubscriptions(req.params.phrase, function(videos) {
    console.log(videos.length);
    videos.sort(function(a, b){return b.published.localeCompare(a.published);})
    videos = videos.slice(0, config.app.videosinresponse);

    for (i = 0; i < videos.length; i++) {
      videos[i]['media:group']['media:description'] =
        '<iframe width="650" height="390" src="https://www.youtube.com/embed/' + videos[i]['yt:videoId'] +
        '?autoplay=0&origin=http://feedfix.gbt.cc" frameborder="0" allowfullscreen></iframe><br>' +
        videos[i]['media:group']['media:description'].split("\n").join("<br>");;
    }

    res.set('Content-Type', 'text/xml');
		res.render('atom', { videos: videos });
  });

});

app.use(function(req, res) {
    res.status(404).send('Not found');
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
