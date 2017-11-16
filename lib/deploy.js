/**
 * Created by Mithun.Das on 11/15/2017.
 */


var config = require('../config.json');

var level = require('level')
    , s3sync = require('s3-sync')
    , readdirp = require('readdirp')

// To cache the S3 HEAD results and speed up the
// upload process. Usage is optional.


module.exports = {
    deployToS3Bucket : function(localrepopath,cb){



        var files = readdirp({
            root: localrepopath
            , directoryFilter: ['!.git', '!cache']
        })

// Takes the same options arguments as `knox`,
// plus some additional options listed above
        var uploader = s3sync( {
            key: config.aws_access_key_id
            , secret: config.aws_access_key_secret
            , bucket: config.bucket
            , concurrency: 16
            , prefix : config.bucket_sub_folder //optional prefix to files on S3
        })

        files.pipe(uploader)
            .on('data', function(file) {
                //console.log(file.fullPath + ' -> ' + file.url)
            })
            .on('error', function (err) { console.error('fatal error', err); })
            .once('end', function() {
                cb(null, true);
            })


    }
}
