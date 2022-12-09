var express = require('express');
var router = express.Router();
var ddata = {duser: [], dnamae: [], dextension: []};
var ddata1 = [];
var pdata = {puser: [], pnamae: [], pextension: []};
var pdata1 = [];
const childprocess = require("child_process");


/*ディレクトリ変数
const dbdna = "./opt/blast/db_dna";
const dbprotein = "./opt/blast/db_protein";
const tmpplace =;
const makeblastdbplace = 
*/

//サーバ用
const dbdna = "/data2/sequenceserver/sequenceserver-1.0.14/db/db_nucleotide/";
const dbprotein = "/data2/sequenceserver/sequenceserver-1.0.14/db/db_protein/";
const seqserver = "/data2/sequenceserver/sequenceserver-1.0.14";
const tmpplace = seqserver + "/tmp/";
const makeblastdbplace = "/suikou/tool/ncbi-blast-2.6.0+/bin/makeblastdb";


function dremove(){
    let dcheckarray = [];
    let dcheckelement = document.getElementsByName("dnacheckbox");

    for(let i = 0; i < dcheckelement.length; i++)
    {
    if(dcheckelement[i].checked)
        dcheckarray.push(dcheckelement[i].value.replace("dcheckbox",""));
    }
 

    console.log(dcheckarray);

    const fs = require("fs");


    window.location.reload();
}

function premove(){
	let pcheckarray = [];
	let pcheckelement = document.getElementsByName("proteincheckbox");
	
	for(let i = 0; i < pcheckelement.length; i++)
	{
		if(pcheckelement[i].checked)
			pcheckarray.push(pcheckelement[i].value.replace("pcheckbox",""));
	}

	console.log(pcheckarray);

	window.location.reload();
}


/* GET users listing. */
router.get('/', (req, res, next) => {
	const fs1 = require('fs');
	fs1.readdir(dbdna, (err, files) => {
		var duser = [];
		var dnamae = [];
		var dextension = [];
		files.forEach(file => {
			ddata1.push(file);
		});
		ddata1.sort();
		for(let i = 0;  i < ddata1.length; i++)
		{
			var s = 0;
			var k = 0;
			while(ddata1[i].charAt(s) != "_"){s++};
			while(ddata1[i].charAt(k) != "."){k++};
			var duser1 = ddata1[i].substring(0,s);
			var dnamae1 = ddata1[i].substring(s+1, k);
			var dextension1 = ddata1[i].substring(k+1, ddata1[i].length);
			duser.push(duser1);
			dnamae.push(dnamae1);
			dextension.push(dextension1);
			if(i > 0)
			{
				for(let k = 0; k < duser.length - 1; k++)
				{
					if(duser[duser.length-1] == duser[k] && dnamae[duser.length-1] == dnamae[k])
					{
						duser.pop();
						dnamae.pop();
						dextension.pop();
						break;
					}
				}
			}
		}
		console.log("c");
		ddata.duser=duser;
		ddata.dnamae=dnamae;
		ddata.dextension=dextension;
	});
	const fs2 = require('fs');
	fs2.readdir(dbprotein, (err, files) => {
		var puser = [];
		var pnamae = [];
		var pextension = [];
		files.forEach(file => {
			pdata1.push(file);
		});
		pdata1.sort();
		for(let i = 0;  i < pdata1.length; i++)
		{
			var s = 0;
			var k = 0;
			while(pdata1[i].charAt(s) != "_"){s++};
			while(pdata1[i].charAt(k) != "."){k++};
			var puser1 = pdata1[i].substring(0,s);
			var pnamae1 = pdata1[i].substring(s+1, k);
			var pextension1 = pdata1[i].substring(k+1, pdata1[i].length);
			puser.push(puser1);
			pnamae.push(pnamae1);
			pextension.push(pextension1);
			if(i > 0)
			{
				for(let k = 0; k < puser.length - 1; k++)
				{
					if(puser[puser.length-1] == puser[k] && pnamae[puser.length-1] == pnamae[k])
					{
						puser.pop();
						pnamae.pop();
						pextension.pop();
						break;
					}
				}
			}	
		}
		pdata.puser=puser;
		pdata.pnamae=pnamae;
		pdata.pextension=pextension;
	});

	ddata1 = [];
	pdata1 = [];

	setTimeout(function(){
		res.render("list", {duser: ddata.duser, dnamae: ddata.dnamae, dextension: ddata.dextension,
			 puser: pdata.puser, pnamae: pdata.pnamae, pextension: pdata.pextension});
	}, 50);
});

router.post('/', (req, res, next) => {

	const fs = require("fs");
	if(typeof(req.body.drenamebefore) != "undefined")
	{
		var before = req.body.drenamebefore;
		var s = 0;
		var k = 0;
		while(before.charAt(s) != "_"){s++};
		while(before.charAt(k) != "."){k++};
		var duser = before.substring(0,s);
		var dnamae = before.substring(s+1, k);
		var dextension = before.substring(k+1, before.length);

		var ddata2 =[];
		console.log("a");

		fs.readdir(dbdna, (err, files) => {
			files.forEach(file => {
				ddata2.push(file);
			});
			ddata2.sort();
			console.log("b");
			for(let i = 0;  i < ddata2.length; i++)
			{
				var s = 0;
				var k = 0;
				while(ddata2[i].charAt(s) != "_"){s++};
				while(ddata2[i].charAt(k) != "."){k++};
				var duser2 = ddata2[i].substring(0,s);
				var dnamae2 = ddata2[i].substring(s+1, k);
				var dextension2 = ddata2[i].substring(k+1, ddata2[i].length);
				var after = duser2 + "_" + req.body.drenameafter + "." + dextension2;
				console.log(dextension2);

				if(duser == duser2 && dnamae == dnamae2 && dextension2 != "fasta" && dextension2 != "fa")
				{
					fs.unlinkSync(dbdna + ddata2[i]);
				}				
			}
			for(let i = 0;  i < ddata2.length; i++)
			{
				var s = 0;
				var k = 0;
				while(ddata2[i].charAt(s) != "_"){s++};
				while(ddata2[i].charAt(k) != "."){k++};
				var duser2 = ddata2[i].substring(0,s);
				var dnamae2 = ddata2[i].substring(s+1, k);
				var dextension2 = ddata2[i].substring(k+1, ddata2[i].length);
				console.log(dextension2);

				if(duser == duser2 && dnamae == dnamae2 && (dextension2 == "fasta" || dextension2 == "fa"))
				{
					console.log("renamesync");
					var after = duser2 + "_" + req.body.drenameafter + "." + dextension2;
					fs.rename(dbdna + ddata2[i], dbdna + after, err => {
						if(err) throw err;
						console.log(before + "-->" + after);
						var makeblastfile = after;
						var text = childprocess.spawnSync(makeblastdbplace + " -in " + dbdna + makeblastfile + " -dbtype nucl -hash_index -parse_seqids -title " + makeblastfile, {shell: true}, );
						console.log(text.stderr.toString());
						if(text.stderr.toString()){res.send("ERROR:   " + text.stderr.toString());}			
					});
				}
			}
		});
	}
	else if(typeof(req.body.prenamebefore) != "undefined")
	{
		var before = req.body.prenamebefore;
		var s = 0;
		var k = 0;
		while(before.charAt(s) != "_"){s++};
		while(before.charAt(k) != "."){k++};
		var puser = before.substring(0,s);
		var pnamae = before.substring(s+1, k);
		var pextension = before.substring(k+1, before.length);

		var pdata2 =[];
		fs.readdir(dbprotein, (err, files) => {
			files.forEach(file => {
				pdata2.push(file);
			});
			pdata2.sort();
			console.log("b");
			for(let i = 0;  i < pdata2.length; i++)
			{
				var s = 0;
				var k = 0;
				while(pdata2[i].charAt(s) != "_"){s++};
				while(pdata2[i].charAt(k) != "."){k++};
				var puser2 = pdata2[i].substring(0,s);
				var pnamae2 = pdata2[i].substring(s+1, k);
				var pextension2 = pdata2[i].substring(k+1, pdata2[i].length);
				var after = puser2 + "_" + req.body.prenameafter + "." + pextension2;
				console.log(pextension2);

				if(puser == puser2 && pnamae == pnamae2 && pextension2 != "fasta" && pextension2 != "fa")
				{
					fs.unlinkSync(dbprotein + pdata2[i]);
				}				
			}
			for(let i = 0;  i < pdata2.length; i++)
			{
				var s = 0;
				var k = 0;
				while(pdata2[i].charAt(s) != "_"){s++};
				while(pdata2[i].charAt(k) != "."){k++};
				var puser2 = pdata2[i].substring(0,s);
				var pnamae2 = pdata2[i].substring(s+1, k);
				var pextension2 = pdata2[i].substring(k+1, pdata2[i].length);
				console.log(pextension2);

				if(puser == puser2 && pnamae == pnamae2 && (pextension2 == "fasta" || pextension2 == "fa"))
				{
					console.log("renamesync");
					var after = puser2 + "_" + req.body.prenameafter + "." + pextension2;
					fs.rename(dbprotein + pdata2[i], dbprotein + after, err => {
						if(err) throw err;
						console.log(before + "-->" + after);
						var makeblastfile = after;
						var text = childprocess.spawnSync(makeblastdbplace + " -in " + dbprotein + makeblastfile + " -dbtype prot -hash_index -parse_seqids -title " + makeblastfile, {shell: true}, );
						console.log(text.stderr.toString());
						if(text.stderr.toString()){res.send("ERROR:   " + text.stderr.toString());}			
					});
				}
			}
		});
	}
	else if(typeof(req.body.dcheckbox) != "undefined" && typeof(req.body.drename) == "undefined")
	{
		var before = req.body.dcheckbox;
		var s = 0;
		var k = 0;
		while(before.charAt(s) != "_"){s++};
		while(before.charAt(k) != "."){k++};
		var duser = before.substring(0,s);
		var dnamae = before.substring(s+1, k);
		var ddata3 = [];

		fs.readdir(dbdna, (err, files) => {
			files.forEach(file => {
				ddata3.push(file);
			});
			console.log(ddata3);
			for(let i = 0; i < ddata3.length; i++)
			{
				let x = 0;
				let y = 0;
				while(ddata3[i].charAt(x) != "_"){x++};
				while(ddata3[i].charAt(y) != "."){y++};
				if(duser == ddata3[i].substring(0,x) && dnamae == ddata3[i].substring(x+1,y))
					fs.unlinkSync(dbdna + ddata3[i]);
			}
		});
	}
	else if(typeof(req.body.pcheckbox) != "undefined" && typeof(req.body.prename == "undefined"))
	{
		var before = req.body.pcheckbox;
		var s = 0;
		var k = 0;
		while(before.charAt(s) != "_"){s++};
		while(before.charAt(k) != "."){k++};
		var puser = before.substring(0,s);
		var pnamae = before.substring(s+1, k);
		var pdata3 = [];

		fs.readdir(dbprotein, (err, files) => {
			files.forEach(file => {
				pdata3.push(file);
			});
			console.log(pdata3);
			for(let i = 0; i < pdata3.length; i++)
			{
				let x = 0;
				let y = 0;
				while(pdata3[i].charAt(x) != "_"){x++};
				while(pdata3[i].charAt(y) != "."){y++};
				if(puser == pdata3[i].substring(0,x) && pnamae == pdata3[i].substring(x+1,y))
					fs.unlinkSync(dbprotein + pdata3[i]);
			}
		});
	}


    if(fs.existsSync(tmpplace + "restart.txt")){
		fs.unlinkSync(tmpplace + "restart.txt", (err) => {
		  if(err) throw err;
		});
		}
		fs.writeFile(tmpplace + "restart.txt", "", (err) => {
		  if(err){throw err;}
		});
	

	res.redirect("list");
})

module.exports = router;