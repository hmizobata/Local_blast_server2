//モジュールの読み込み
var express = require('express');
var router = express.Router();
const childprocess = require("child_process");
const fs = require('fs');
const { file } = require('babel-types');
const conf = require('config');

//configファイルから変更する変数↓

//許容するファイルタイプ・拡張子
const permitted_filetypes = new RegExp(conf.filetypes.permitted_filetypes_list);
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
			if(permitted_filetypes.test(file)){
				ddata1.push(file);
			}
		});
		ddata1.sort();

		//ファイルをユーザー名・ファイル名・拡張子名に分割して配列にぶちこむ。
		for(let i = 0;  i < ddata1.length; i++)
		{
			//ファイル名からユーザー名、もとのファイル名、拡張子を取得。
			file_info = filename_split(ddata1[i]);
			console.log(file_info);

			//拡張子が.fasta,.faのものだけを集計する。
			if(permitted_extensions.test(file_info[2])){
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
			if(permitted_filetypes.test(file))
				pdata1.push(file);
		});
		pdata1.sort();
		
		//ファイルをユーザー名・ファイル名・拡張子名に分割して配列にぶちこむ。
		for(let i = 0;  i < pdata1.length; i++)
		{
			//ファイル名からユーザー名、もとのファイル名、拡張子を取得。
			file_info = filename_split(pdata1[i]);

			//拡張子が.fasta,.faのものだけを集計する。
			if(permitted_extensions.test(file_info[2])){
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
			 puser: pdata.puser, pnamae: pdata.pnamae, pextension: pdata.pextension, seqserver: url_seqserver});
	}, 50);
});

//renameやremoveなど、ページ内のボタンを押した場合の処理。
router.post('/', (req, res, next) => {

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
				if(permitted_filetypes.test(file))
					ddata2.push(file);
			});
			ddata2.sort();

			//renameしたいファイルの拡張子がmakeblastdbによってできたものだった場合、消去する。
			for(let i = 0;  i < ddata2.length; i++)
			{
				//ファイル名からユーザー名・もとのファイル名・拡張子を取得。
				var file_info = filename_split(ddata2[i]);

				//makeblastdbでできたファイルを削除(ユーザー名&もとのファイル名がrename対象で、かつ拡張子がfasta,faじゃなければ消去)。
				if(file_info[0] == before_info[0] && file_info[1] == before_info[1] && permitted_extensions.test(file_info[2]) == false)
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
				if(file_info[0] == before_info[0] && file_info[1] == before_info[1] && permitted_extensions.test(file_info[2]))
				{
					//rename後ファイル名を設定し、rename実行。エラーとログを出力。
					var after = file_info[0] + "_" + req.body.drenameafter + "." + file_info[2];
					fs.rename(dbdna + ddata2[i], dbdna + after, err => {
						if(err) throw err;
						console.log(before + "-->" + after);

						//makeblastdbの実行。エラーは出力。
						var text = childprocess.spawnSync("bash makeblastdb.sh " + dbdna +" nucl "+ after, {shell: true}, );
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
				if(permitted_filetypes.test(file))
					pdata2.push(file);
			});
			pdata2.sort();

			//renameしたいファイルの拡張子がmakeblastdbによってできたものだった場合、消去する。
			for(let i = 0;  i < pdata2.length; i++)
			{
				//ファイル名からユーザー名・もとのファイル名・拡張子を取得。
				var file_info = filename_split(pdata2[i]);

				//makeblastdbでできたファイルを削除(ユーザー名&もとのファイル名がrename対象で、かつ拡張子がfasta,faじゃなければ消去)。
				if(file_info[0] == before_info[0] && file_info[1] == before_info[1] && permitted_extensions.test(file_info[2]) == false)
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
				if(file_info[0] == before_info[0] && file_info[1] == before_info[1] && permitted_extensions.test(file_info[2]))
				{
					//rename後ファイル名を設定し、rename実行。エラーとログを出力。
					var after = file_info[0] + "_" + req.body.prenameafter + "." + file_info[2];
					fs.rename(dbprotein + pdata2[i], dbprotein + after, err => {
						if(err) throw err;
						console.log(before + "-->" + after);

						//makeblastdbの実行。エラーは出力。
						var text = childprocess.spawnSync("bash makeblastdb.sh " + dbprotein + " prot "  + after, {shell: true}, );
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

		//チェックが入っているチェックボックスを取得。チェックが一つの場合はstringが返ってくるので、複数のケースに合わせてarrayに変換する。
		var filenames;
		if(typeof req.body.dcheckbox === "string")
			filenames = [req.body.dcheckbox];
		else
			filenames = req.body.dcheckbox;

		//ファイル名を分割し、ユーザー名ともとのファイル名を配列に格納。
		filenames.forEach(file => {
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
		res.redirect("list");
	}
	else if(typeof(req.body.pcheckbox) != "undefined" && typeof(req.body.prename == "undefined"))//proteinデータの削除
	{
		//リストの定義
		var user = [];
		var filename = [];

		//チェックが入っているチェックボックスを取得。チェックが一つの場合はstringが返ってくるので、複数のケースに合わせてarrayに変換する。
		var filenames;
		if(typeof req.body.pcheckbox === "string")
			filenames = [req.body.pcheckbox];
		else
			filenames = req.body.pcheckbox;

		//ファイル名を分割し、ユーザー名ともとのファイル名を配列に格納。
		filenames.forEach(file => {
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
		res.redirect("list");
	}

	res.redirect("list");
})

module.exports = router;
