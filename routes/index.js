var express = require('express');
var router = express.Router();
let data = {object:[
               ["object/", "Object test", "(not actively maintained)"],
               ["object/results", "Object test - results", ""]
              ],
              java:[
               ["object/java/", "Java applet test", "(not actively maintained)"],
               ["object/java/results", "Java applet test - results", ""]
              ]};

/* GET home page. */
router.get('/', (req, res, next) => {
  console.log(req.query.say);
  console.log(req.query.to);
  const execSync = require('child_process').execSync;
  const result =  execSync('ipconfig').toString();
  console.log(result);

  const fs = require('fs');

  fs.readdir('.', (err, files) => {
        files.forEach(file => {
        console.log(file);
        });
  });


  data[0]=req.query.say;
  data[1]=req.query.to;
  res.render('index', { title: 'Express', data: data });
});


module.exports = router;
