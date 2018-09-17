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

// Retrieve user with user_id and game_id 
router.get('/:uid/:gid', function (req, res) {
 
    let uid = req.params.uid;
    let gid = req.params.gid;
 
    if (!uid || !gid) {
        return res.status(400).send({ error: true, message: 'Please provide uid and gid' });
    }
 
    mc.query('SELECT * FROM picks where user_id=? AND game_id=?', [uid, gid], function (error, results, fields) {
        if (error) throw error;
        return res.send(results[0]);
    });
 
});

// Add a new pick  
router.post('/', function (req, res) {
    console.log('trying to create user');
    let uid = req.body.data.user_id;
    let gid = req.body.data.game_id;
    let win = req.body.data.winner;
    if (!uid || !gid || !win) {
        return res.status(400).send({ error: true, message: 'Please provide uid, gid, and win' });
    }
 
    mc.query("INSERT INTO picks SET ? ", { user_id: uid, game_id: gid, winner: win}, function (error, results, fields) {
        if (error) throw error;
        return res.send(results);
    });
});

//  Update pick with id
router.put('/', function (req, res) {
    console.log("trying to update...");
    let uid = req.body.data.user_id;
    let gid = req.body.data.game_id;
    let win = req.body.data.winner;
    if (!uid || !gid || !win) {
        return res.status(400).send({ error: true, message: 'Please provide uid, gid, and win' });
    }
 
    mc.query("UPDATE picks SET ? WHERE user_id = ? AND game_id = ?", [{winner: win}, uid, gid], function (error, results, fields) {
        if (error) throw error;
        return res.send({ error: false, data: results, message: 'User has been updated successfully.' });
    });
});

module.exports = router;