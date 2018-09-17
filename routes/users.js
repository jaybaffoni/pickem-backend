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

// Retrieve all users 
router.get('/', function (req, res) {
    mc.query('SELECT * FROM users', function (error, results, fields) {
        if (error) throw error;
		res.send(results);
    });
});

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

router.get('/rank/:uid', function (req, res) {
    let user_id = req.params.uid;
    let week = getWeek();
    console.log('getting rank');
    console.log(user_id);
    var wins = 0;
    var last = 0;
    var total = 0;
    mc.query('SELECT * FROM weeks where user_id=? AND week_number=?', [user_id, week], function (error, results, fields) {
        if (error) throw error;
        if(results.length > 0){
            wins = results[0].wins;
            console.log('this week: ' + wins);
            mc.query('SELECT * FROM weeks where user_id=? AND week_number=?', [user_id, week-1], function (error, results, fields) {
                if (error) throw error;
                if(results.length > 0){
                    last = results[0].wins;
                    console.log('last week: ' + last);
                    mc.query('SELECT * FROM weeks where user_id=? AND week_number=?', [user_id, 'TOT'], function (error, results, fields) {
                        if (error) throw error;
                        if(results.length > 0){
                            total = results[0].wins;
                            console.log('all time: ' + total);
                            var userObject = {wins: wins, last: last, total: total};
                            return (res.send(userObject));
                            
                        }
                    });
                }
            });
        }
    });
    
});

// Retrieve user with username 
router.get('/:id', function (req, res) {
 
    let uid = req.params.id;
 
    if (!uid) {
        return res.status(400).send({ error: true, message: 'Please provide uid' });
    }
 
    mc.query('SELECT * FROM users where user_name=?', uid, function (error, results, fields) {
        if (error) throw error;
        return res.send(results[0]);
    });
 
});

// Add a new user  
router.post('/', function (req, res) {
    console.log('trying to create user');
    let uname = req.body.data.user_name;
    let pass = req.body.data.password;
 
    if (!uname || !pass) {
        return res.status(400).send({ error:true, message: 'Please provide username and password' });
    }
 
    mc.query("INSERT INTO users SET ? ", { user_name: uname, password: pass}, function (error, results, fields) {
        if (error) throw error;
        return res.send(results);
    });
});

//  Update user with id
router.put('/', function (req, res) {
    console.log("trying to update...");
    let uid = req.body.data.user_id;
    let uname = req.body.data.user_name;
    let pass = req.body.data.password;
    if (!uid) {
        return res.status(400).send({ error: true, message: 'Please provide uid' });
    }
 
    mc.query("UPDATE users SET ? WHERE user_id = ?", [{user_name: uname, password: pass}, uid], function (error, results, fields) {
        if (error) throw error;
        return res.send({ error: false, data: results, message: 'User has been updated successfully.' });
    });
});

module.exports = router;