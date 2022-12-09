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

