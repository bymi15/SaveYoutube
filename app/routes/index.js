var express = require('express');
var fs = require('fs');
var ytdl = require('ytdl-core');
var ffmpeg = require('fluent-ffmpeg');
var os = require('os');
var ypi = require('youtube-playlist-info');
var url = require('url');
var sanitize = require('sanitize-filename');
const querystring = require('querystring');
const path = require('path');
const uuidV4 = require('uuid/v4');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'SaveYoutube' });
});

router.get('/download/:fileName', function(req, res, next) {
    var file = "./public/uploads/" + req.params.fileName;
    return res.download(file); // Set disposition and send it.
});

//functions
getUrlType = function(urlStr){
    var str = url.parse(urlStr);
    if(str.pathname == '/watch'){
        return 0;
    }else if(str.pathname == '/playlist'){
        return 1;
    }else{
        return -1;
    }
}
getVideoID = function(urlStr){
    var str = url.parse(urlStr);
    var query = querystring.parse(str.query);
    return query.v;
}
getPlaylistID = function(urlStr){
    var str = url.parse(urlStr);
    var query = querystring.parse(str.query);
    return query.list;
}

router.post('/mp4', function(req, res, next) {
    var urlYoutube = req.body.youtubeURL;
    var type = getUrlType(urlYoutube);
    if(type == 1){
        //youtube playlist
        var playlistID = getPlaylistID(urlYoutube);
        ypi.playlistInfo("AIzaSyCVJ60ErxljD3iStH0vd_LN_t3Y7MStpoU", playlistID, function(playlist){
            return res.send({ playlist: playlist });
        });
    }else if(type == 0){
        //youtube video
        var videoReadableStream = ytdl(urlYoutube);

        ytdl.getInfo(urlYoutube, function(err, info){
            if(err){
                console.log(err);
                return res.send({ error: "Error! Please try again." });
            }

            var videoName = sanitize(info.title.toString('ascii'));

            if (fs.existsSync('./public/uploads/' + videoName + '.mp4')) {
                return res.send({ file: '/download/' + videoName + '.mp4' });
            }else{
                var videoWritableStream = fs.createWriteStream('./public/uploads/' + videoName + '.mp4');

                var stream = videoReadableStream.pipe(videoWritableStream);

                stream.on('finish', function() {
                    return res.send({ file: '/download/' + videoName + '.mp4' });
                });
            }
        });

    }else{
        //invalid URL
        return res.send({ error: "Error! Please enter a valid youtube URL." });
    }
});

router.get('/mp4/:id', function(req, res, next) {
    var urlYoutube = "http://youtube.com/watch?v=" + req.params.id;

    var videoReadableStream = ytdl(urlYoutube);

    //youtube video
    ytdl.getInfo(urlYoutube, function(err, info){
        if(err){
            console.log(err);
            return res.send({ error: "Error! Please try again." });
        }

        var videoName = sanitize(info.title.toString('ascii'));

        if (fs.existsSync('./public/uploads/' + videoName + '.mp4')) {
            return res.send({ file: '/download/' + videoName + '.mp4' });
        }else{
            var videoWritableStream = fs.createWriteStream('./public/uploads/' + videoName + '.mp4');

            var stream = videoReadableStream.pipe(videoWritableStream);

            stream.on('finish', function() {
                return res.send({ file: '/download/' + videoName + '.mp4' });
            });
        }
    });
});

router.post('/playlist/mp4', function(req, res, next) {
    var urlYoutube = req.body.youtubeURL;
    var type = getUrlType(urlYoutube);
    if(type == 1){
        //youtube playlist
        var playlistID = getPlaylistID(urlYoutube);
        ypi.playlistInfo("AIzaSyCVJ60ErxljD3iStH0vd_LN_t3Y7MStpoU", playlistID, function(playlist){
            for(var key in playlist){
                var vidID = playlist[key].resourceId.videoId;
                var vidURL = "http://youtube.com/watch?v=" + vidID;

                var videoName = sanitize(playlist[key].title.toString('ascii'));
                var videoReadableStream = ytdl(vidURL);
                var videoWritableStream = fs.createWriteStream('./public/uploads/' + videoName + '.mp4');
                var stream = videoReadableStream.pipe(videoWritableStream);
                stream.on('finish', function() {
                    playlist[key].fileName = fileName;
                });
            }
            return res.send({ playlist: playlist });
        });
    }else{
        //invalid URL
        return res.send({ error: "Error! Please enter a valid youtube playlist URL." });
    }
});

router.post('/mp3', function(req, res, next) {
    var urlYoutube = req.body.youtubeURL;
    var type = getUrlType(urlYoutube);
    if(type == 1){
        //youtube playlist
        var playlistID = getPlaylistID(urlYoutube);
        ypi.playlistInfo("AIzaSyCVJ60ErxljD3iStH0vd_LN_t3Y7MStpoU", playlistID, function(playlist){
            return res.send({ playlist: playlist });
        });
    }else if(type == 0){
        //youtube video
        /*var fileName = uuidV4() + '.mp3';
        var filePath = './public/uploads/' + fileName;
        var stream = ytdl(urlYoutube, { filter: 'audioonly'});

        var proc = new ffmpeg({source:stream});
        if(os.platform() === 'win32'){
            proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg.exe'));
        }else{
            proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg'));
        }

        proc.toFormat('mp3').on('end', function() {
            return res.send({ fileName: fileName });
        }).on('error', function(err) {
            console.log(err.message);
            res.send({ error: "Error! Youtube video could not be converted to MP3. Please try again." });
        }).saveToFile(filePath);*/
        var videoReadableStream = ytdl(urlYoutube, { filter: 'audioonly'});
        ytdl.getInfo(urlYoutube, function(err, info){
            if(err){
                console.log(err);
                return res.send({ error: "Error! Please try again." });
            }

            var videoName = sanitize(info.title.toString('ascii'));

            if (fs.existsSync('./public/uploads/' + videoName + '.mp3')) {
                return res.send({ file: '/download/' + videoName + '.mp3' });
            }else{
                var proc = new ffmpeg({source:videoReadableStream});
                if(os.platform() === 'win32'){
                    proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg.exe'));
                }else{
                    proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg'));
                }

                proc.toFormat('mp3').on('end', function() {
                    return res.send({ file: '/download/' + videoName + '.mp3' });
                }).on('error', function(err) {
                    console.log(err.message);
                    res.send({ error: "Error! Youtube video could not be converted to MP3. Please try again." });
                }).saveToFile('./public/uploads/' + videoName + '.mp3');
            }
        });
    }else{
        //invalid URL
        return res.send({ error: "Error! Please enter a valid youtube URL." });
    }
});
router.get('/mp3/:id', function(req, res, next) {
    var urlYoutube = "http://youtube.com/watch?v=" + req.params.id;
    /*var fileName = uuidV4() + '.mp3';
    var filePath = './public/uploads/' + fileName;
    var stream = ytdl(urlYoutube, { filter: 'audioonly'});

    var proc = new ffmpeg({source:stream});
    if(os.platform() === 'win32'){
        proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg.exe'));
    }else{
        proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg'));
    }

    proc.toFormat('mp3').on('end', function() {
        return res.redirect('/download/' + fileName);
    }).on('error', function(err) {
        console.log(err.message);
        return res.render('error', { message: "Error! Youtube video could not be converted to MP3. Please try again." });
    }).saveToFile(filePath);*/
    var videoReadableStream = ytdl(urlYoutube, { filter: 'audioonly'});
    ytdl.getInfo(urlYoutube, function(err, info){
        if(err){
            console.log(err);
            return res.send({ error: "Error! Please try again." });
        }

        var videoName = sanitize(info.title.toString('ascii'));

        if (fs.existsSync('./public/uploads/' + videoName + '.mp3')) {
            return res.send({ file: '/download/' + videoName + '.mp3' });
        }else{
            var proc = new ffmpeg({source:videoReadableStream});
            if(os.platform() === 'win32'){
                proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg.exe'));
            }else{
                proc.setFfmpegPath(path.resolve('./public/lib/ffmpeg'));
            }

            proc.toFormat('mp3').on('end', function() {
                return res.send({ file: '/download/' + videoName + '.mp3' });
            }).on('error', function(err) {
                console.log(err.message);
                res.send({ error: "Error! Youtube video could not be converted to MP3. Please try again." });
            }).saveToFile('./public/uploads/' + videoName + '.mp3');
        }
    });
});

router.get('/clearUploads', function(req, res, next) {
    var dirPath = './public/uploads';
    try { var files = fs.readdirSync(dirPath); }
        catch(e) { return; }
        if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
          var filePath = dirPath + '/' + files[i];
          if (fs.statSync(filePath).isFile())
            fs.unlinkSync(filePath);
          else
            rmDir(filePath);
        }
    res.render('index', { title: 'SaveYoutube', msg: 'Uploads folder has been cleared!' });
});

module.exports = router;
