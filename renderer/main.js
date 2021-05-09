const electron = require('electron');
const ipc = electron.ipcRenderer;
// const ProjectWindow = require("../main-process/projectWindow.js").ProjectWindow;

ipc.on("recent-files", (event, files) => 
{
	let recentfiles = document.getElementById("recentfiles");

	for (var i = 0; i < files.length; i++)
	{
		let div = document.createElement("div");
		div.className = "file";
		
		let title = document.createElement("div");
		title.innerText = files[i].substring(files[i].lastIndexOf("/") + 1);
		title.className = "filename";
		
		let path = document.createElement("div");
		path.innerText = files[i];
		path.className = "path";
		
		div.appendChild(title); 
		div.appendChild(path);
		div.onclick = () =>
		{
			ipc.send("open-file", path.innerText)
		}
		
		recentfiles.appendChild(div);
	}
});