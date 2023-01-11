//モジュールの読み込み
var express = require('express');
var router = express.Router();
const childprocess = require("child_process");
const fs = require('fs');
const { file } = require('babel-types');

//テスト用PATH
const dbdna = "./opt/blast/db_dna/";
const dbprotein = "./opt/blast/db_protein/";
const tmpplace = "./tmp/";
const makeblastdbplace = "./ncbi-blast-2.12.0+/bin/makeblastdb.exe";

//suikouサーバ用PATH
// const dbdna = "/data2/sequenceserver/sequenceserver-2.0.0-db/db_nucleotide/";
// const dbprotein = "/data2/sequenceserver/sequenceserver-2.0.0-db/db_protein/";
// const seqserver = "/data2/sequenceserver/sequenceserver-2.0.0-db";
// const tmpplace = seqserver + "/tmp/";
// const makeblastdbplace = "/suikou/tool/ncbi-blast-2.13.0+/bin/makeblastdb";

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

//最初のページ表示。
router.get('/', (req, res, next) => {
	
	//データベース内のファイルを取得するときの変数。
	var ddata = {duser: [], dnamae: [], dextension: []};
	var ddata1 = [];
	var pdata = {puser: [], pnamae: [], pextension: []};
	var pdata1 = [];

	//nucleotideファイルの読み込み。
	fs.readdir(dbdna, (err, files) => {
		
		//ファイル一覧をユーザー名・ファイル名・拡張子名に分けてぶち込むリスト。
		var duser = [];
		var dnamae = [];
		var dextension = [];

		//DB内ファイルを一つずつ取得し、ddata1にぶちこむ。最後にsort。
		files.forEach(file => {
			ddata1.push(file);
		});
		ddata1.sort();

		//ファイルをユーザー名・ファイル名・拡張子名に分割して配列にぶちこむ。
		for(let i = 0;  i < ddata1.length; i++)
		{
			//ファイル名からユーザー名、もとのファイル名、拡張子を取得。
			file_info = filename_split(ddata1[i]);

			//拡張子が.fasta,.faのものだけを集計する。
			if(/^(fasta|fa)$/.test(file_info[2])){
				duser.push(file_info[0]);
				dnamae.push(file_info[1]);
				dextension.push(file_info[2]);
			}
		}

		//配列を連想配列にぶちこむ。
		ddata.duser=duser;
		ddata.dnamae=dnamae;
		ddata.dextension=dextension;
	});

	//proteinファイルの読み込み。
	fs.readdir(dbprotein, (err, files) => {

		//ファイル一覧をユーザー名・ファイル名・拡張子名に分けてぶち込むリスト。
		var puser = [];
		var pnamae = [];
		var pextension = [];
		
		//DB内ファイルを一つずつ取得し、ddata1にぶちこむ。最後にsort。		
		files.forEach(file => {
			pdata1.push(file);
		});
		pdata1.sort();
		
		//ファイルをユーザー名・ファイル名・拡張子名に分割して配列にぶちこむ。
		for(let i = 0;  i < pdata1.length; i++)
		{
			//ファイル名からユーザー名、もとのファイル名、拡張子を取得。
			file_info = filename_split(pdata1[i]);

			//拡張子が.fasta,.faのものだけを集計する。
			if(/^(fasta|fa)$/.test(file_info[2])){
				puser.push(file_info[0]);
				pnamae.push(file_info[1]);
				pextension.push(file_info[2]);
			}
		}
		
		//配列を連想配列にぶちこむ。
		pdata.puser=puser;
		pdata.pnamae=pnamae;
		pdata.pextension=pextension;
	});

	//ユーザー名・ファイル名・拡張子名をnucleotide/protein別に格納したデータをviews/list.pugに渡す。
	setTimeout(function(){
		res.render("list", {duser: ddata.duser, dnamae: ddata.dnamae, dextension: ddata.dextension,
			 puser: pdata.puser, pnamae: pdata.pnamae, pextension: pdata.pextension});
	}, 50);
});

//renameやremoveなど、ページ内のボタンを押した場合の処理。
router.post('/', (req, res, next) => {

	//"Upload Files"ボタンが押されたとき、uploadページに遷移して終了。
	if(typeof(req.body.upload) != "undefined"){
		res.redirect("upload");
		return;
	}

	if(typeof(req.body.drenamebefore) != "undefined")//nucleotideファイルのrename
	{
		//renameするファイル名を取得し、ユーザー名・(original)ファイル名・拡張子名に分割
		var before = req.body.drenamebefore;
		var before_info = filename_split(before);

		var ddata2 =[];

		//renameの実行。ファイル一覧を取得し、対象のファイルのみに処理を実施。
		fs.readdir(dbdna, (err, files) => {
			
			//DB内のファイル一覧を配列にぶちこみ、ソート。
			files.forEach(file => {
				ddata2.push(file);
			});
			ddata2.sort();

			//renameしたいファイルの拡張子がmakeblastdbによってできたものだった場合、消去する。
			for(let i = 0;  i < ddata2.length; i++)
			{
				//ファイル名からユーザー名・もとのファイル名・拡張子を取得。
				var file_info = filename_split(ddata2[i]);

				//makeblastdbでできたファイルを削除(ユーザー名&もとのファイル名がrename対象で、かつ拡張子がfasta,faじゃなければ消去)。
				if(file_info[0]==before_info[0] && file_info[1]==before_info[1] && /^(fasta|fa)$/.test(file_info[2])==false)
				{
					fs.unlinkSync(dbdna + ddata2[i]);
				}				
			}

			//上の処理でmakeblastdb関連ファイルは消去できたので、renameの実行。
			for(let i = 0;  i < ddata2.length; i++)
			{
				//ファイル名からユーザー名・もとのファイル名・拡張子を取得。
				var file_info = filename_split(ddata2[i]);

				//ユーザー名・もとのファイル名・拡張子がrename対象のときに実行
				if(file_info[0]==before_info[0] && file_info[1]==before_info[1] && /^(fasta|fa)$/.test(file_info[2]))
				{
					//rename後ファイル名を設定し、rename実行。エラーとログを出力。
					var after = file_info[0] + "_" + req.body.drenameafter + "." + file_info[2];
					fs.rename(dbdna + ddata2[i], dbdna + after, err => {
						if(err) throw err;
						console.log(before + "-->" + after);

						//makeblastdbの実行。エラーは出力。
						var text = childprocess.spawnSync(makeblastdbplace + " -in " + dbdna + after + " -dbtype nucl -hash_index -parse_seqids -title " + makeblastfile, {shell: true}, );
						if(text.stderr.toString()){res.send("ERROR:   " + text.stderr.toString());}	
					});
				}
			}
		});
	}
	else if(typeof(req.body.prenamebefore) != "undefined")//proteinファイルのrename。
	{
		//renameするファイル名を取得し、ユーザー名・(original)ファイル名・拡張子名に分割
		var before = req.body.prenamebefore;
		var before_info = filename_split(before);

		var pdata2 =[];

		//renameの実行。ファイル一覧を取得し、対象のファイルのみに処理を実施。
		fs.readdir(dbprotein, (err, files) => {
			
			//DB内のファイル一覧を配列にぶちこみ、ソート。
			files.forEach(file => {
				pdata2.push(file);
			});
			pdata2.sort();

			//renameしたいファイルの拡張子がmakeblastdbによってできたものだった場合、消去する。
			for(let i = 0;  i < pdata2.length; i++)
			{
				//ファイル名からユーザー名・もとのファイル名・拡張子を取得。
				var file_info = filename_split(pdata2[i]);

				//makeblastdbでできたファイルを削除(ユーザー名&もとのファイル名がrename対象で、かつ拡張子がfasta,faじゃなければ消去)。
				if(file_info[0]==before_info[0] && file_info[1]==before_info[1] && /^(fasta|fa)$/.test(file_info[2])==false)
				{
					fs.unlinkSync(dbprotein + pdata2[i]);
				}				
			}

			//上の処理でmakeblastdb関連ファイルは消去できたので、renameの実行。
			for(let i = 0;  i < pdata2.length; i++)
			{
				//ファイル名からユーザー名・もとのファイル名・拡張子を取得。
				var file_info = filename_split(pdata2[i]);

				//ユーザー名・もとのファイル名・拡張子がrename対象のときに実行
				if(file_info[0]==before_info[0] && file_info[1]==before_info[1] && /^(fasta|fa)$/.test(file_info[2]))
				{
					//rename後ファイル名を設定し、rename実行。エラーとログを出力。
					var after = file_info[0] + "_" + req.body.prenameafter + "." + file_info[2];
					fs.rename(dbprotein + pdata2[i], dbprotein + after, err => {
						if(err) throw err;
						console.log(before + "-->" + after);

						//makeblastdbの実行。エラーは出力。
						var text = childprocess.spawnSync(makeblastdbplace + " -in " + dbprotein + after + " -dbtype prot -hash_index -parse_seqids -title " + makeblastfile, {shell: true}, );
						if(text.stderr.toString()){res.send("ERROR:   " + text.stderr.toString());}	
					});
				}
			}
		});
	}
	else if(typeof(req.body.dcheckbox) != "undefined" && typeof(req.body.drename) == "undefined")//nucleotideデータの削除
	{
		//リストの定義
		var user = [];
		var filename = [];

		//チェックが入っているチェックボックスのファイル名を分割し、ユーザー名・ファイル名を取得。
		req.body.dcheckbox.forEach(file => {
			var file_info = filename_split(file);
			user.push(file_info[0]);
			filename.push(file_info[1]);
		})

		//DB内ファイルを一つずつ確認し、ユーザー名・ファイル名が削除対象と一致すれば削除。
		fs.readdir(dbdna, (err, files) => {
			files.forEach(file => {
				var file_info = filename_split(file);
				for(let i = 0; i < user.length; i++){
					if(file_info[0] == user[i] && file_info[1] == filename[i])
						fs.unlinkSync(dbdna + file);
				}
			});
		});
	}
	else if(typeof(req.body.pcheckbox) != "undefined" && typeof(req.body.prename == "undefined"))//proteinデータの削除
	{
		//リストの定義
		var user = [];
		var filename = [];

		//チェックが入っているチェックボックスのファイル名を分割し、ユーザー名・ファイル名を取得。
		req.body.pcheckbox.forEach(file => {
			var file_info = filename_split(file);
			user.push(file_info[0]);
			filename.push(file_info[1]);
		})

		//DB内ファイルを一つずつ確認し、ユーザー名・ファイル名が削除対象と一致すれば削除。
		fs.readdir(dbprotein, (err, files) => {
			files.forEach(file => {
				var file_info = filename_split(file);
				for(let i = 0; i < user.length; i++){
					if(file_info[0] == user[i] && file_info[1] == filename[i])
						fs.unlinkSync(dbprotein + file);
				}
			});
		});
	}


	// var restart = childprocess.spawnSync('docker restart seqserv2', {shell: true}, );
	// console.log("STDOUT:",restart.stdout.toString());
	// console.log("STDERR:",restart.stderr.toString());

    //if(fs.existsSync(tmpplace + "restart.txt")){
	//	fs.unlinkSync(tmpplace + "restart.txt", (err) => {
	//	  if(err) throw err;
	//	});
	//	}
	//	fs.writeFile(tmpplace + "restart.txt", "", (err) => {
	//	  if(err){throw err;}
	//	});
	
	//listページのリロード
	res.redirect("list");
})

module.exports = router;
