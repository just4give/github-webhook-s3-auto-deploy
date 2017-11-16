#!/usr/bin/env node
/**
 * Created by Mithun.Das on 11/14/2017.
 */

var localrepopath    = "./git-clones";
var chalk       = require('chalk');
var clear       = require('clear');
var CLI         = require('clui');
var figlet      = require('figlet');
var inquirer    = require('inquirer');
var Preferences = require('preferences');
var Spinner     = CLI.Spinner;
var GitHubApi   = require('github');
var _           = require('lodash');
var git         = require('simple-git/promise');
var touch       = require('touch');
var fs          = require('fs');
var files = require('./lib/files');
var deploy = require('./lib/deploy');
var config = require('./config.json');

var path = require('path');

clear();
console.log(
    chalk.yellow(
        figlet.textSync('Ginit', { horizontalLayout: 'full' })
    )
);


function getGithubCredentials(callback) {
    var questions = [
        {
            name: 'username',
            type: 'input',
            message: 'Enter your Github username or e-mail address:',
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your username or e-mail address';
                }
            }
        },
        {
            name: 'password',
            type: 'password',
            message: 'Enter your password:',
            validate: function(value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your password';
                }
            }
        }
    ];

    if(config.credential){

        callback(config.credential);
    }else{
        // inquirer.prompt(questions).then(callback);
    }

}

var prefs = new Preferences('ginit2');

var github = new GitHubApi({
    version: '3.0.0'

})


function getGithubToken(callback) {
    //var prefs = new Preferences('ginit');

    if (prefs.github && prefs.github.token) {


        return callback(null, prefs.github.token);
    }

    // Fetch token
    getGithubCredentials(function(credentials) {

        var status = new Spinner('Authenticating with Github.com, please wait...');
        status.start();

        github.authenticate(

                {
                    type: 'basic',
                    username:credentials.username,
                    password: credentials.password
                }
        );

        console.log('Authentication was successful.');

        github.authorization.create({
            scopes: ['user', 'public_repo', 'repo', 'repo:status'],
            note: 'admin scripts 4'

        }, function (err, res) {


            status.stop();

            if (err){
                return callback( err );
            }
            if (res.data.token) {
                prefs.github = {
                    token : res.data.token
                };


                return callback(null, res.data.token);
            }
        })


    });
}


/* getGithubToken(function(err,token){
     if(!err){
         console.log('Token: ', token);
     }else{
         console.log('Error in authentication',err.message);
     }

});*/

function githubAuth(callback) {
    getGithubToken(function(err, token) {
        if (err) {
            return callback(err);
        }
        github.authenticate({
            type : 'oauth',
            token : token
        });
        return callback(null, token);
    });
}




module.exports={
    deploy :function(){
        githubAuth(function(err, authed) {
            if (err) {
                switch (err.code) {
                    case 401:
                        console.log(chalk.red('Couldn\'t log you in. Please try again.'));
                        break;
                    case 422:
                        console.log(chalk.red('You already have an access token.'));
                        break;
                }
            }
            if (authed) {
                console.log(chalk.green('Successfully authenticated!'));

                var status = new Spinner('Cloning repo , please wait...');
                status.start();

                if(files.directoryExists(path.join(localrepopath,'.git'))){

                    console.log(chalk.green('Repo was already cloned. Making git pull request. Please wait...'));
                    git(localrepopath).pull('origin','master')
                        .then(function(){
                            status.stop();

                            console.log(chalk.green('Git pull completed successfully'));
                            status = new Spinner('Syncing your folder with S3 bucket, please wait...');
                            status.start();
                            deploy.deployToS3Bucket(path.join(localrepopath,config.folder_to_sync),function(err, done){
                                status.stop();
                                if(!err){
                                    console.log(chalk.green('S3 sync completed'));
                                }
                            });
                        },function(err){
                            status.stop();
                            console.log(chalk.red('Error!'), err);
                        })

                }else{
                    git().clone(config.git_repo_url, localrepopath)
                        .then(function(){
                            status.stop();
                            console.log(chalk.green('Repo was cloned successfully'));
                            status = new Spinner('Syncing your folder with S3 , please wait...');
                            status.start();
                            deploy.deployToS3Bucket(path.join(localrepopath,config.folder_to_sync),function(err, done){
                                status.stop();
                                if(!err){
                                    console.log(chalk.green('S3 sync completed'));
                                }
                            });
                        },function(err){
                            status.stop();
                            console.log(chalk.red('Error!'), err);
                        })
                }

            }
        });
    }
}
