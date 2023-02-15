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
const conf = require('config');

//configファイルから変更する変数↓

//許容するファイルタイプ・拡張子
const permitted_filetypes = new RegExp(conf.filetypes.permitted_filetypes_upload);
const permitted_extensions = new RegExp(conf.filetypes.permitted_extensions);

//PATH
const makeblastdbplace = conf.path.makeblastdbplace;
const dbplace = conf.path.dbplace;
const dbdna = conf.path.dbdna;
const dbprotein = conf.path.dbprotein;
const tmpplace = conf.path.tmpplace;
const uploadplace = conf.path.uploadplace;
const errorplace = conf.path.errorplace;
const url_seqserver = conf.url.seqserver;

//configファイルから変更する変数↑

//ファイル名を処理する関数。ユーザー名、ファイル名、拡張子名に分割してarrayを返す。
function filename_split(filename){
	//アンダーバーでファイル名をsplit。
	var split_underbar = filename.split("_");

	//ユーザー名はアンダーバーでsplitしたものの第1項。もとのファイル名・拡張子は置換して獲得。
	var username = split_underbar[0];

	//ファイル名からユーザー名を除去。
	var original_filename = filename.replace(username + "_", "");

	//"."でスプリット
	var split_dot = original_filename.split(".");
	var extension = "";

	//"."でスプリットした最終項から順に見ていき、fasta等に一致したらそれ以降を拡張子とする。
	for(let i = split_dot.length - 1; i > -1; i--){
		if(i == split_dot.length - 1)
			extension = split_dot[i];
		else
			extension = split_dot[i] + "." + extension;
		
		//拡張子を除去した値がoriginal_filenameである。各値が確定したらループを止める。
		if(permitted_extensions.test(split_dot[i])){
			var remExtension = new RegExp("." + extension + "$");
			original_filename = original_filename.replace(remExtension,"");
			break;
		}
	}

	return [username, original_filename, extension];
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
  res.render("upload", {seqserver: url_seqserver});
});

//「Upload」ボタンが押されたときの処理
router.post("/", upload.any(), (req, res) =>{
  //nucleotide/protein情報、ユーザー名、ファイル名の取得
  var radio = req.body.uploadradio;
  var user = req.body.uploaduser;
  var file = req.files[0]["filename"];

  //ファイルがちゃんとfasta,fa,fsa,fna,aaになっているか、スペースを含まないか確認。不適切なファイル名の場合エラーを出力する。
  var isFileFasta = file.match(permitted_filetypes);
  var includeSpaces = file.match(/ /);

  if(isFileFasta == null){
	fs.unlinkSync(uploadplace + file);
	return res.send("Error: This file is inappropriate for the database. <br> 1.Available extensions are '.fasta, .fa, .fasta.gz, .fa.gz, .fsa, .fsa.gz, .fna, .fna.gz, .aa, .aa.gz'.");
  }

  if(includeSpaces != null){
	fs.unlinkSync(uploadplace + file);
	return res.send("Error: This file is inappropriate for the database. <br>Spaces are not available for the file name.");
  }


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
    var filename = file.replace(permitted_filetypes,"");
        
    //「ユーザー名」・「拡張子を除去したファイル名」が一致する場合、エラーを出力。
    if(user==exists_info[0] && filename==exists_info[1]){
	fs.unlinkSync(uploadplace+file);
	return res.send("Error: A file with the same name already exists.");
    }
  }

  //uploadフォルダにアップロードしておいたファイルを、DBディレクトリに移動する。
  fs.copyFileSync(uplodir + file, dir + user + "_" + file);
  fs.unlinkSync(uplodir+file);

  //アップロードファイルがgz形式の場合、解凍する。
  if(/[.]gz$/.test(file)){
    //解凍前後のファイル名をPATHごと取得。変数fileも解凍後の値に変更。
    var gunzipfile = dir + user + "_" + file;
    var gzipcontent = fs.readFileSync(gunzipfile);
    var gunzippedfile = gunzipfile.slice(0, -3);

    //解凍処理を実行。解凍前ファイルは削除。
    zlib.gunzip(gzipcontent, function(err, data){
      fs.writeFileSync(gunzippedfile, data);
      fs.unlinkSync(gunzipfile);
    });
  }

   //makeblastdbの実行。エラーが出たら該当ファイルを削除し、エラー出力。
   var text = childprocess.spawnSync("bash makeblastdb.sh " + dir2 + " " + blast + " " + user + "_" + file + " -parse_seqids", {shell: true}, );
   if(text.stderr.toString()){
	//削除対象ファイルのユーザー名・ファイル名・拡張子名を取得
 	var removefile_info = filename_split(user + "_" + file);

  	//ディレクトリ内を検索し、ユーザー名・ファイル名が一致するものを削除。
  	fs.readdir(dir2, (err, files) => {
  	files.forEach(file => {
  		var eachfile_info = filename_split(file);
  		if(removefile_info[0] == eachfile_info[0] && removefile_info[1] == eachfile_info[1])
  		fs.unlinkSync(dir2+file);
  	})
  });

//エラーメッセージの出力
res.send("ERROR:   " + text.stderr.toString());
};

  childprocess.spawn("kill `ps -a|awk '{if($4==\"bundle\")print $1;}'`; bash run_seqserver.sh", {shell: true}, );
  res.redirect("upload");
})



module.exports = router;
