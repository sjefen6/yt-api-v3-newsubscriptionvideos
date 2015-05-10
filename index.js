var config = require("./config");
var request = require('request');
// youtube-api
var youtube = require('youtube-api');
youtube.authenticate({
  type: "key",
  key: config.youtube.apikey
});
// xml2js
var xml2js = require('xml2js');
var parseString = new xml2js.Parser({
  explicitArray: false
}).parseString;
// express
var express = require('express');
var app = express();
app.set('views', './views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
// body-parser
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true
}));

function getAllSubscriptions(channel, cb, pagetoken, context) {
  youtube.subscriptions.list({
    part: "snippet",
    channelId: channel,
    maxResults: 50,
    pageToken: pagetoken
  }, function (err, data) {
    if(err != null){
      cb(err, null);
    }

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
          context.videos.sort(function(a, b){return b.published.localeCompare(a.published);})
          context.videos = context.videos.slice(0, config.app.videosinresponse);
          cb(null, context.videos);
        }
      });
    });
  });
}

app.get('/', function (req, res) {
  res.render('index');
});

app.post('/', function (req, res) {
  res.redirect('/feed/' + req.body.channelid);
});

app.get('/feed/:channelid', function (req, res) {
  getAllSubscriptions(req.params.channelid, function(err, videos) {
    if (err != null){
      res.status(500).send('Error\n' + JSON.stringify(err)).end();
    } else {
      for (i = 0; i < videos.length; i++) {
        videos[i]['media:group']['media:description'] =
        '<iframe width="650" height="390" src="https://www.youtube.com/embed/' + videos[i]['yt:videoId'] +
        '?autoplay=0" frameborder="0" allowfullscreen></iframe><br>' +
        videos[i]['media:group']['media:description'].split("\n").join("<br>");
      }
      res.set('Content-Type', 'text/xml');
      // Fuckit, KISS! I just need a feed
      res.render('rss', { config: config, videos: videos, channelid: req.params.channelid });
    }
  });

});

app.get('/api/:channelid', function (req, res) {
  getAllSubscriptions(req.params.channelid, function(videos) {
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

  console.log('yt-api-v3-newsubscriptionvideos listening at http://%s:%s', host, port);
});
