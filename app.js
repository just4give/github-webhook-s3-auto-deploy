/**
 * Created by Mithun.Das on 11/15/2017.
 */
var express = require('express')
var app = express();
var bodyParser = require('body-parser');

var port = process.env.PORT||1400;

app.use(bodyParser.json());

app.get('/', function(req,res){

})

var build = require('./build');

app.post('/webhook',function(req,res,next){
    console.log('Request received from web hook ', new Date());
    var repoName = req.body.repository.name;
    build.deploy();


})
app.listen(port, function(){
    console.log('Web hook receiver app listening on port '+port);
});