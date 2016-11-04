var syncPhotoModel = require('../models/syncPhotoModel');
var exec = require('child_process').exec;
var sc = require('./syncController.js');
var cfg = require('../config.js')

var defaultInterval = interval = 0
var noCount = 0;
var numPhotoPerUpload = 100;

var dirPathAry = [
    '\\\\172.16.166.35\\shdr\\website\\photos',
    '\\\\172.16.166.5\\shdr\\website\\photos',
    '\\\\172.16.166.73\\shdr\\website\\photos',
    '\\\\172.16.164.33\\shdr\\website\\photos',
    '\\\\172.16.164.20\\shdr\\website\\photos',
    '\\\\172.16.165.133\\shdr\\website\\photos',
];

var time = new Date();
var y = time.getFullYear();
var m = time.getMonth();
var d = time.getDate();
var query = {
    isUpload: false,
    uploadCount: { '$lte': 2 },
    disabled: false,
    receivedOn: { $gte: new Date(y, m, d) },

    //$and:[{
    //    $or:[
    //        {'shootOn': { $gt: new Date('2016/10/28 00:00:00') }},{'customerIds.code':'shdrk2scxehfhap3'}]
    //}],
    //photoStatus: { $ne: 'bad' },
    //justForOriginal:false,

    customerIds: { $ne: [] },
    customerIds: { $ne: null },
    //'customerIds.code': 'shdrk2scxehfhap3',
};

var condition = {
    limit: numPhotoPerUpload, sort: { 'receivedOn': 1 }
};

function dirServerPath(){
    dirPathAry.forEach(function(e, i, a){
        exec('dir ' + e, {}, function () {
            //console.log(arguments)
            console.log('dir path',e);
        })
    })
}

getPhotos({condition: condition, query: query}, loop);
function getPhotos (opt, fn) {
    //dirServerPath();
    console.time('getPhotos')
    console.time('loop')
    syncPhotoModel.find(
        opt.query, {}, opt.condition,
        function (err, photos) {
            console.timeEnd('getPhotos')
            //console.log('---photos.Length---', photos.length)

            if (photos && photos.length > 0) {
                opt.interval = defaultInterval;
                sc.testTick(photos, function (result) {
                    //console.log('sc.testTick do result', result)
                    fn.bind(null)(opt)
                })

                var time = new Date();
                var now = time.getTime();
                var y = time.getFullYear();
                var m = time.getMonth();
                var d = time.getDate();
                var latestSyncPhoto = photos[photos.length - 1].receivedOn;
                var farTime = now - new Date(latestSyncPhoto).getTime();
                if(farTime > cfg.syncFar*60*1000){
                    noCount--;
                    var query = {
                        isUpload: false,
                        uploadCount: { '$lte': 2 },
                        disabled: false,
                        receivedOn: { $gte: new Date(y, m, d) },
                        customerIds: { $ne: [] },
                        customerIds: { $ne: null },
                    };

                    var condition = {
                        limit: numPhotoPerUpload, sort: { 'receivedOn': -1 }
                    };
                    var opt_ = {condition: condition, query: query}
                    opt_.once = true;
                    fn.bind(null)(opt_)
                }

            } else {
                console.log('---photoLength---', 0)

                noCount++;
                if (noCount > 1000) {
                    interval = 1000 * 5
                } else if (noCount > 10000) {
                    interval = 1000 * 60 * 2
                }
                opt.interval = interval;
                fn.bind(null)(opt);

                var time = new Date();
                var y = time.getFullYear();
                var m = time.getMonth();
                var d = time.getDate();
                var query = {
                    isUpload: false,
                    uploadCount: { '$lte': 2 },
                    disabled: false,
                    receivedOn: {$lt: new Date(y, m, d)},
                    customerIds: { $ne: [] },
                    customerIds: { $ne: null },
                };

                var condition = {
                    limit: numPhotoPerUpload, sort: { 'receivedOn': -1 }
                };
                var opt_ = {condition: condition, query: query}
                opt_.once = true;
                opt_.interval = defaultInterval;
                fn.bind(null)(opt_)
            }
        }
    )
};

function loop(opt){
    console.log(opt)
    setTimeout(function(){
        var fn = loop
        if(opt.once){
            fn = function(){
                //console.warn('\r\n\r\n==========================', 'do once')
            }
        }
        console.timeEnd('loop')
        getPhotos.bind(null)({condition: opt.condition, query: opt.query}, fn)
    }, opt.interval)
}



process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err.stack);
    console.log('Process will go on run!');
});
