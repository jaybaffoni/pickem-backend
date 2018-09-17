var axios = require('axios');
var parseString = require('xml2js').parseString;

var express = require('express');
var router = express.Router();

var mysql = require('mysql')
var mc = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'theenemysgateisdown',
  database : 'pickem'
});

mc.connect();

function getWeek(){
    var week0 = 1535515200000;
    var currentTime = new Date().getTime();
    var secondsInWeek = 1000 * 60 * 60 * 24 * 7;
    var diff = currentTime - week0;
    var weeks = parseInt(diff/secondsInWeek);
    console.log(weeks);
    if(weeks > 17) weeks = 17;
    if(weeks < 1) weeks = 1;
    return weeks;
}

// Retrieve user with user_id and game_id 
router.get('/', function (req, res) {

  let week_id = getWeek();

  mc.query("SELECT * FROM games WHERE week=?", [week_id], function (error, results, fields) {
    if (error) throw error;
    console.log(results.length);
    return res.send(results);
  });
 
    // axios.get('https://www.nfl.com/liveupdate/scores/scores.json')
    //       .then((response) => {
    //             return res.send(response.data);
                
    //         })
    //       .catch((error) => {
    //         console.log(error);
    //       });
 
});

function updatePicks() {
  console.log('Updating picks');
  //get all picks where correct is null
  mc.query('SELECT * FROM picks WHERE correct IS NULL', function (error, results, fields) {
    if (error) throw error;
    results.forEach((element) => {
      mc.query('SELECT * FROM games where game_id=?', element.game_id, function (error, results, fields) {
        if (error) throw error;
        if(results[0]){
          if(results[0].status.startsWith("F")){
            console.log(results[0].winner);
            var cor = 0;
            var thisWinner = element.winner;
            if(results[0].winner == thisWinner){
              cor = 1;
            } 
            mc.query("UPDATE picks SET ? WHERE user_id = ? AND game_id = ?", [{correct: cor}, element.user_id, element.game_id], function (error, results, fields) {
              if (error) throw error;
              console.log('updated: ' + cor);
            });
          }
          
        }
      });
    });
    //after all picks are updated, update weeks
    getScores();
  });
  
}

function getScores() {
  console.log('Getting scores');
  let week_id = getWeek();
  mc.query('SELECT * FROM users', function (error, results, fields) {
      if (error) throw error;
      results.forEach((element) => {
          var usr = element.user_id;
          var name = element.user_name;
          var wins = 0;
          var losses = 0;
        mc.query('SELECT * FROM picks where user_id=? AND correct=1 AND week=?', [element.user_id, week_id], function (error, results, fields) {
          if (error) throw error;
          wins = results.length;
          mc.query('SELECT * FROM picks where user_id=? AND correct=0 AND week=?', [element.user_id, week_id], function (error, results, fields) {
              if (error) throw error;
              losses = results.length;
              console.log(name + ": " + wins + " - " + losses);
              mc.query("INSERT INTO weeks SET ? ON DUPLICATE KEY " + 
                  "UPDATE wins=?, losses=?", 
                  [{ user_id: element.user_id, week_number: week_id, wins: wins, losses: losses}, 
                    wins, losses], 
                  function (error, results, fields) {
                    if (error) throw error;
                    mc.query('SELECT * FROM picks where user_id=? AND correct=1', element.user_id, function (error, results, fields) {
                      if (error) throw error;
                      var totalWins = results.length;
                      mc.query('SELECT * FROM picks where user_id=? AND correct=0', element.user_id, function (error, results, fields) {
                        if (error) throw error;
                        var totalLosses = results.length;
                        mc.query("INSERT INTO weeks SET ? ON DUPLICATE KEY " + 
                          "UPDATE wins=?, losses=?", 
                          [{ user_id: element.user_id, week_number: 'TOT', wins: totalWins, losses: totalLosses}, 
                            totalWins, totalLosses], 
                          function (error, results, fields) {
                            if (error) throw error;
                            console.log(name + ": " + totalWins + " - " + totalLosses);
                          });
                      });
                    });
                  });
            });
        });
      });
    });

}

router.get('/update', function (req, res) {

  let week_id = getWeek();
  console.log('Updating week: ' + week_id);
    axios.get('http://www.nfl.com/ajax/scorestrip?season=2018&seasonType=REG&week=' + week_id)
          .then((response) => {
                parseString(response.data, function (err, result) {
                  var week = result.ss.gms[0].$.w;
                  var season = result.ss.gms[0].$.y;
                  var count = Object.keys(result.ss.gms[0].g).length;
                  console.log('Number of games: ' + count);
                  var i;
                  for (i = 0; i < count; i++) { 
                      var winner = "tie";
                      var game = result.ss.gms[0].g[i];
                      if(game.$.q.startsWith('F')){
                        //console.log(game.$.h + ": " + game.$.hs + " - " + game.$.v + ": " + game.$.vs);
                        if(parseInt(game.$.hs) > parseInt(game.$.vs)){
                          winner = game.$.h;
                        } else if(parseInt(game.$.vs) > parseInt(game.$.hs)){
                          winner = game.$.v;
                        }
                        //console.log(winner);
                        mc.query("INSERT INTO games SET ? ON DUPLICATE KEY " + 
                        "UPDATE day=?, time=?, hs=?, vs=?, status=?, winner=?", 
                        [{ game_id: game.$.eid, week: week, season: season, day: game.$.d, time: game.$.t,
                        home: game.$.h, visitor: game.$.v, hnn: game.$.hnn, vnn: game.$.vnn, hs: game.$.hs, vs: game.$.vs,
                        status: game.$.q, winner: winner}, 
                          game.$.d, game.$.t, game.$.hs, game.$.vs, game.$.q, winner], 
                        function (error, results, fields) {
                          if (error) throw error;
                        });
                      }
                  }
                  updatePicks();
                });
                
                
            })
          .catch((error) => {
            console.log(error);
          });
    return(res.send('done'));
});

module.exports = router;