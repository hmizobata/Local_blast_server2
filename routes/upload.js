//モジュールの読み込み
var express = require('express');
var router = express.Router();
const multer = require("multer");
const fs = require("fs");
const zlib = require("zlib");
const childprocess = require("child_process");
const { exec, execSync } = require("child_process");
const { stdout } = require('process');
const { callbackify } = require('util');

//ローカルテスト用PATH
const makeblastdbplace = "./ncbi-blast-2.12.0+/bin/makeblastdb.exe";
const dbplace = "./opt/blast/";
const dbdna = dbplace + "db_dna/";
const dbprotein = dbplace + "db_protein/";
const tmpplace = "./tmp/";
const uploadplace = "./uploads/";

// //suikouサーバー用PATH
// const makeblastdbplace = "/suikou/tool/ncbi-blast-2.13.0+/bin/makeblastdb";
// const seqserver = "/data2/sequenceserver/sequenceserver-2.0.0-db";
// const dbplace = seqserver;
// const tmpplace = seqserver + "/tmp/";
// const dbdna = dbplace + "/db_nucleotide/";
// const dbprotein = dbplace + "/db_protein/";
// const uploadplace = seqserver + "/uploads/";



//ファイル名を処理する関数。ユーザー名、ファイル名、拡張子名に分割してarrayを返す。
function filename_split(filename){
	//アンダーバー、".fa"でファイル名をsplit。
	var split_underbar = filename.split("_");
	var split_fa = filename.split(".fa");

	//ユーザー名はアンダーバーでsplitしたものの第1項、拡張子は".fa"でsplitしたものの最終項+"fa"。ファイル名は全体からそれらを削ったもの。
	var username = split_underbar[0];
	var extention = "fa" + split_fa[split_fa.length - 1];
	var original_filename = filename.slice(username.length + 1).slice(0, -1-extention.length);

	return [username, original_filename, extention];
}


//ファイルを元の名前（originalname）で指定の場所(uploadplace)にアップロード。
const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, uploadplace)
  },
  filename: function(req, file, cb){
    cb(null, file.originalname)
  }
})
const upload = multer({storage: storage});



//最初のページ表示。テンプレート(upload.pug)を読み込む。
router.get('/', function(req, res, next) {
  res.render("upload",);
});



//「Upload」ボタンが押されたときの処理
router.post("/", upload.any(), (req, res) =>{

  if(typeof(req.body.list) != undefined){
    res.redirect("list");
    return;
  }
  
  //nucleotide/protein情報、ユーザー名、ファイル名の取得
  var radio = req.body.uploadradio;
  var user = req.body.uploaduser;
  var file = req.files[0]["filename"];

  //ファイルがちゃんとfasta,faになっているか、スペースを含まないか確認。不適切なファイル名の場合エラーを出力する。
  var isFileFasta = file.match(/[.](fasta|fa)([.]gz|)$/);
  var includeSpaces = file.match(/ /);
  
  if(isFileFasta == null)
    return res.send("Error: This file is inappropriate for the database. <br> 1.Available extensions are '.fasta, .fa, .fasta.gz, .fa.gz'.");

  if(includeSpaces != null)
    return res.send("Error: This file is inappropriate for the database. <br>Spaces are not available for the file name.");


  //ファイルアップロード先、makeblastdb時のdbtypeの指定。チェックボックスのnucleotide/proteinの値から判定。
  var nucldir = dbdna;
  var protdir = dbprotein;
  var uplodir = uploadplace;
  var dir = nucldir;
  var blast = "nucl";
  var dir2 = dbdna;
  if(radio == "protein"){
    dir = protdir;
    blast = "prot";
    dir2 = dbprotein;
  }

  //DBディレクトリ内の全ファイルを確認し、同一のユーザー名・もとのファイル名を持つファイルがあればエラーを出す。（このとき、拡張子がfaとfastaで違っても同一視してエラーを出すようにする。）
  var exists = fs.readdirSync(dir, {withFileTypes: false});
  for(let k = 0; k < exists.length; k++){
    //DBディレクトリ内ファイル名からユーザー名・拡張子を除いたファイル名・拡張子を取得。
    var exists_info = filename_split(exists[k]);
    
    //アップロードしようとしているファイル名から、拡張子を除去した値を取得。
    var filename = file;
    if(/[.]fasta[.]gz$/.test(filename))
      filename = filename.slice(0, -9);
    else if(/[.]fa[.]gz$/.test(filename))
      filename = filename.slice(0, -6);
    else if(/[.]fasta$/.test(filename))
      filename = filename.slice(0, -6);
    else
      filename = filename.slice(0, -3);
    
    //「ユーザー名」・「拡張子を除去したファイル名」が一致する場合、エラーを出力。
    if(user==exists_info[0] && filename==exists_info[1])
      return res.send("Error: A file with the same name already exists.");
  }

  //uploadフォルダにアップロードしておいたファイルを、DBディレクトリに移動する。
  fs.renameSync(uplodir + file, dir + user + "_" + file);

  //アップロードファイルがgz形式の場合、解凍する。
  if(/[.](fasta|fa)[.]gz$/.test(file)){
    //解凍前後のファイル名をPATHごと取得。変数fileも解凍後の値に変更。
    var gunzipfile = dir + user + "_" + file;
    var gzipcontent = fs.readFileSync(gunzipfile);
    var gunzippedfile = gunzipfile.slice(0, -3);
    file = file.slice(0, -3);

    //解凍処理を実行。解凍前ファイルは削除。
    zlib.gunzip(gzipcontent, function(err, data){
      fs.writeFileSync(gunzippedfile, data);
      fs.unlinkSync(gunzipfile);
    });
  }

  // //makeblastdbの実行。エラーが出たら該当ファイルを削除し、エラー出力。
  // var text = childprocess.spawnSync(makeblastdbplace + " -in " + dir2 + user + "_" + file + " -dbtype " + blast + " -hash_index -parse_seqids -title " + user + "_" + file, {shell: true}, );
  // if(text.stderr.toString()){
  //   //削除対象ファイルのユーザー名・ファイル名・拡張子名を取得
  //   var removefile_info = filename_split(user + "_" + file);

  //   //ディレクトリ内を検索し、ユーザー名・ファイル名が一致するものを削除
  //   fs.readdir(dir2, (err, files) => {
  //     files.forEach(file => {
  //       var eachfile_info = filename_split(file);
  //       if(removefile_info[0] == eachfile_info[0] && removefile_info[1] == eachfile_info[1])
  //         fs.unlinkSync(dir2 + file);
  //     })
  //   });

  //   //エラーメッセージの出力
  //   res.send("ERROR:   " + text.stderr.toString());
  // };

        // var restart = childprocess.spawnSync('docker restart seqserv2', {shell: true}, );
        // console.log("STDOUT:",restart.stdout.toString());
        // console.log("STDERR:",restart.stderr.toString());

  res.redirect("upload");
})



module.exports = router;
