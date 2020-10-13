var express = require('express');
var fs = require('fs');
var ytdl = require('ytdl-core');
var ffmpeg = require('fluent-ffmpeg');
var os = require('os');
const ytlist = require('youtube-playlist');
var url = require('url');
var sanitize = require('sanitize-filename');
const path = require('path');
var pathToFfmpeg = require('ffmpeg-static');

var router = express.Router();

const getUrlType = (urlStr) => {
    var str = url.parse(urlStr);
    if(str.pathname == '/watch'){
        return 0;
    }else if(str.pathname == '/playlist'){
        return 1;
    }else{
        return -1;
    }
}

const downloadYoutube = async (urlYoutube, type, res) => {
    try{
        const info = await ytdl.getInfo(urlYoutube);
        const videoName = sanitize(info.videoDetails.title.toString('ascii'));
        const fileName = videoName + '.' + type;
        const file = './public/uploads/' + fileName;

        if (fs.existsSync(file)) {
            res.send({downloadUrl: '/download/' + fileName});
        }else{
            let videoReadableStream;
            if(type==='mp3'){
                videoReadableStream = ytdl(urlYoutube, { filter: 'audioonly'});
            }else{
                videoReadableStream = ytdl(urlYoutube);
            }
            var proc = new ffmpeg({source:videoReadableStream});
            proc.setFfmpegPath(pathToFfmpeg);
            proc.toFormat(type).on('end', function() {
                res.send({downloadUrl: '/download/' + fileName});
            }).on('error', function(err) {
                console.log(err.message);
                res.send({ error: `Error! Youtube video could not be converted to ${type}. Please try again.` });
            }).saveToFile(file);
        }
    }catch(err){
        console.log(err);
        return res.send({ error: "Error! Please try again." });
    }
}

router.get('/', (_req, res) => {
    res.render('index', { title: 'SaveYoutube' });
});

router.get('/download/:fileName', (req, res) => {
    var file = "./public/uploads/" + req.params.fileName;
    return res.download(file);
});

router.post('/mp4', async(req, res) => {
    var urlYoutube = req.body.youtubeURL;
    var type = getUrlType(urlYoutube);
    if(type == 1){
        const response = await ytlist(urlYoutube, ['id', 'name', 'url']);
        return res.send({ playlist: response.data.playlist });
    }else if(type == 0){
        return await downloadYoutube(urlYoutube, 'mp4', res);
    }else{
        return res.send({ error: "Error! Please enter a valid youtube URL." });
    }
});

router.get('/mp4/:id', async(req, res) => {
    var urlYoutube = "http://youtube.com/watch?v=" + req.params.id;
    await downloadYoutube(urlYoutube, 'mp4', res);
});

router.post('/playlist', async(req, res) => {
    var urlYoutube = req.body.youtubeURL;
    var type = getUrlType(urlYoutube);
    if(type == 1){
        const response = await ytlist(urlYoutube, ['id', 'name', 'url']);
        return res.send({ playlist: response.data.playlist });
    }else{
        return res.send({ error: "Error! Please enter a valid youtube playlist URL." });
    }
});

router.post('/mp3', async(req, res) => {
    var urlYoutube = req.body.youtubeURL;
    var type = getUrlType(urlYoutube);
    if(type == 1){
        const response = await ytlist(urlYoutube, ['id', 'name', 'url']);
        return res.send({ playlist: response.data.playlist });
    }else if(type == 0){
        return await downloadYoutube(urlYoutube, 'mp3', res);
    }else{
        return res.send({ error: "Error! Please enter a valid youtube URL." });
    }
});

router.get('/mp3/:id', async(req, res) => {
    var urlYoutube = "http://youtube.com/watch?v=" + req.params.id;
    await downloadYoutube(urlYoutube, 'mp3', res);
});

router.get('/clearUploads', (_req, res) => {
    const dirPath = './public/uploads';
    let files;
    try { 
        files = fs.readdirSync(dirPath); 
    }catch(e) {
        console.error(e); 
    }
    if (files.length > 0){
        for (let i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            try {
                if(fs.statSync(filePath).isFile()){
                    fs.unlinkSync(filePath);
                }else{
                    rmDir(filePath);
                }
            }catch(e) {
                console.error(e); 
            }
        }
    }
    res.render('index', { title: 'SaveYoutube', msg: 'Uploads folder has been cleared!' });
});

module.exports = router;
