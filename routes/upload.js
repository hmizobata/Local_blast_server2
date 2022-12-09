var express = require('express');
var router = express.Router();
const multer = require("multer");
const fs = require("fs");
const zlib = require("zlib");
const childprocess = require("child_process");
const { exec, execSync } = require("child_process");
const { stdout } = require('process');
const { callbackify } = require('util');
const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, "/data2/sequenceserver/sequenceserver-1.0.14/uploads/")
  },
  filename: function(req, file, cb){
    cb(null, file.originalname)
  }
})
const upload = multer({storage: storage});

/*変数/
const dbdna = "db_dna\\";
const dbprotein = "db_protein\\";
const makeblastdbplace = ".\\ncbi-blast-2.12.0+\\bin\\makeblastdb";
const dbplace = ".\\opt\\blast\\";
const tmpplace = ".\\tmp\\";
const uploadplace = ".\\uploads\\";
*/

//サーバー用
const makeblastdbplace = "/suikou/tool/ncbi-blast-2.6.0+/bin/makeblastdb";
const seqserver = "/data2/sequenceserver/sequenceserver-1.0.14";
const dbplace = seqserver + "/db";
const tmpplace = seqserver + "/tmp/";
const dbdna = dbplace + "/db_nucleotide/";
const dbprotein = dbplace + "/db_protein/";
const uploadplace = seqserver + "/uploads/";

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render("upload",);
});


router.post("/", upload.any(), (req, res) =>{
  console.log(req.body);
  var radio = req.body.uploadradio;
  var user = req.body.uploaduser;
  var file = req.files[0]["filename"];
  console.log(uploadplace + req.files[0]["filename"]);

  var abc = file.match(/[.](fasta|fa)([.]gz|)$/);
  var abc2 = file.match(/[.].*[.](fasta|fa)([.]gz|)$/);
  var def = file.match(/ /);

  if(abc == null || abc2 != null)
    return res.send("Error: This file is inappropriate for the database. <br> 1.Available extensions are '.fasta, .fa, .fasta.gz, .fa.gz'. <br> 2.'.' is not available for a file name.");

  if(def != null)
   return res.send("Error: This file is inappropriate for the database. <br>Spaces are not available for the file name.");

    var nucldir = dbdna;
    var protdir = dbprotein;
    var uplodir = uploadplace;
    var dir = nucldir;
    var blast = "nucl";
    var dir2 = dbdna;

    if(radio == "protein")
    {
      dir = protdir;
      blast = "prot";
      dir2 = dbprotein;
    }

    var exists = fs.readdirSync(dir, {withFileTypes: false});

    for(let k = 0; k < exists.length; k++)
      if(user + "_" + file == exists[k])
        return res.send("Error: A file with the same name already exists.");

    fs.renameSync(uplodir + file, dir + user + "_" + file);

    var s = 0;
    while(file.charAt(s) != ".")
      s++;
    
    var ghi = file.match(/[.]fasta[.]gz$/);
    var jkl = file.match(/[.]fa[.]gz$/);

    if(ghi != null || jkl != null)
    {
      var gzipcontent = fs.readFileSync(dir + user + "_" + file);
      var gunzipfile = dir + user + "_" + file;
      var gunzippedfile = dir + user + "_" + file.substring(0, file.length-3);
      file = file.substring(0, file.length-3);
      console.log(file.substring(0, file.length-3));
      zlib.gunzip(gzipcontent, function(err, data){
        fs.writeFileSync(gunzippedfile, data);
        fs.unlinkSync(gunzipfile);
      });
    }

   
    var text = childprocess.spawnSync(makeblastdbplace + " -in " + dir2 + user + "_" + file + " -dbtype " + blast + " -hash_index -parse_seqids -title " + user + "_" + file, {shell: true}, );
    console.log(text.stderr.toString());
    if(text.stderr.toString())
      {
         var ddata3 = [];
         let z = 0;
         for(let i = 0; i < file.length; i++)
           {
             while(file.charAt(z) != "."){z++};
           }
         fs.readdir(dir2, (err, files) => {
           files.forEach(file => {
             ddata3.push(file);
           });
           for(let i = 0; i < ddata3.length; i++)
             {
               let x = 0;
               let y = 0;
               while(ddata3[i].charAt(x) != "_"){x++};
               while(ddata3[i].charAt(y) != "."){y++};
               if(user == ddata3[i].substring(0,x) && file.substring(0,z) == ddata3[i].substring(x+1,y))
                 fs.unlinkSync(dir2 + ddata3[i]);
             }
         });
         res.send("ERROR:   " + text.stderr.toString());
      }

    if(fs.existsSync(tmpplace + "restart.txt")){
    fs.unlinkSync(tmpplace + "restart.txt", (err) => {
      if(err) throw err;
    });
    }
    fs.writeFile(tmpplace + "restart.txt", "", (err) => {
      if(err){throw err;}
    });
  

  res.redirect("upload");
})



module.exports = router;
