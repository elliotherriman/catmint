const electron = require('electron');
const ipc = electron.ipcMain;
const dialog = electron.dialog;
const BrowserWindow = electron.BrowserWindow;
const path = require("path");
const fs = require("fs");
const chokidar = require('chokidar');
const child_process = require('child_process');
const spawn = child_process.spawn;

const baseWindow = {
	webPreferences: {
		nodeIntegration: true,
		contextIsolation: false,
	},
    backgroundColor: "#000",
	minWidth: 350,
	minHeight: 250,
	title: "Catmint"
};

const viewerWindow = Object.assign({
	width: 1300,
	height: 730,
}, baseWindow);

const welcomeWindow = Object.assign({
	width: 700,
	height: 450,
}, baseWindow);

var windows = [];

const recentFilesPath = path.join(electron.app.getPath("userData"), "recent-files.json");

let onRecentFilesChanged = null;

// inklecate is packaged outside of the main asar bundle since it's executable
const inklecateNames = {
    "darwin": "/ink/inklecate_mac",
    "win32":  "/ink/inklecate_win.exe",
    "linux": "/ink/inklecate_linux"
}
const inklecateRootPathRelease = path.join(__dirname, "../../app.asar.unpacked/main-process");
const inklecateRootPathDev = __dirname;

var inklecatePath = path.join(inklecateRootPathRelease, inklecateNames[process.platform]);

// If inklecate isn't available here, we're probably in development mode (not packaged into a release asar)
try { fs.accessSync(inklecatePath) }
catch(e) {
    inklecatePath = path.join(inklecateRootPathDev, inklecateNames[process.platform]);
}

function ProjectWindow(filePath)
{ 
    if (!filePath) 
	{
		this.browserWindow = new BrowserWindow(welcomeWindow);
		this.browserWindow.loadURL("file://" + __dirname + "/../renderer/splash.html");

		this.browserWindow.webContents.on('did-finish-load', () => {
			this.browserWindow.webContents.send("recent-files", ProjectWindow.getRecentFiles());
		});
	}
	else
	{	
		this.browserWindow = new BrowserWindow(viewerWindow);
		this.browserWindow.loadURL("file://" + __dirname + "/../renderer/viewer.html");
		this.relPath = path.basename(filePath);
		this.projectDir = path.dirname(filePath);
		this.startFileWatching(filePath);

		this.browserWindow.webContents.on('did-finish-load', () => {
			this.browserWindow.webContents.send("load-html", filePath);
		});

        this.browserWindow.webContents.on('dom-ready', () => 
		{
            this.browserWindow.setRepresentedFilename(filePath);
        });
    }
	
	windows.forEach((win) => {
		if (!win.relPath)
		{
			win.browserWindow.close();
		}
	});
	
	windows.push(this);

    this.browserWindow.on("closed", () => 
	{
		if( this.fileWatcher )
        	this.fileWatcher.close();

        var idx = windows.indexOf(this);
        if( idx != -1 )
            windows.splice(idx, 1);
    });
}

ProjectWindow.prototype.openDevTools = function() {
    this.browserWindow.webContents.openDevTools();
}

ProjectWindow.all = () => windows;

ProjectWindow.createEmpty = function() {
    return new ProjectWindow();
}

ProjectWindow.focused = function() {
    var browWin = BrowserWindow.getFocusedWindow();
    if( browWin )
        return ProjectWindow.withWebContents(browWin.webContents);
    else
        return null;
}

ProjectWindow.withWebContents = function(webContents) {
    if( !webContents )
        return null;

    for(var i=0; i<windows.length; i++) {
        if( windows[i].browserWindow.webContents === webContents )
            return windows[i];
    }
    return null;
}

ProjectWindow.setRecentFilesChanged = function(f) {
    onRecentFilesChanged = f;
}

ProjectWindow.getRecentFiles = function() {
    if(!fs.existsSync(recentFilesPath)) {
        return [];
    }
    const json = fs.readFileSync(recentFilesPath, "utf-8");
    try {
        return JSON.parse(json);
    } catch(e) {
        console.error("Error in recent files JSON parsing:", e);
        return [];
    }
}

function addRecentFile(filePath) 
{
    const resolvedFilePath = path.resolve(filePath);
    const recentFiles = ProjectWindow.getRecentFiles();
    const newRecentFiles = recentFiles.indexOf(resolvedFilePath) >= 0 ?
        recentFiles :
        [resolvedFilePath].concat(recentFiles).slice(0, 5);
    
	fs.writeFileSync(recentFilesPath, JSON.stringify(newRecentFiles), {
        encoding: "utf-8"
    });
   
	if(onRecentFilesChanged) {
        onRecentFilesChanged(newRecentFiles);
    }
}

ProjectWindow.prototype.startFileWatching = function(path) {

    if( this.fileWatcher )
        this.fileWatcher.close();

    this.fileWatcher = chokidar.watch(this.projectDir, {
        disableGlobbing: true,
    });

    const isInkFile = fileAbsPath => {
        return fileAbsPath.split(".").pop() == "ink";
    };

    this.fileWatcher.on("change", (updatedAbsFilePath) => {
		this.browserWindow.webContents.send("ink-recompiled");

		if (!isInkFile(updatedAbsFilePath)) { return; }

		recompile(updatedAbsFilePath);
    });
}

function recompile(mainInkPath) 
{
	var options = ["-o", path.parse(mainInkPath).name + ".json", path.parse(mainInkPath).base];

    var playProcess = spawn(inklecatePath, options, {
        "cwd": path.dirname(mainInkPath),
        "env": {
            "MONO_BUNDLED_OPTIONS": "--debug"
        }
    });

	playProcess.stderr.setEncoding('utf8');
    playProcess.stderr.on('data', (data) => 
	{
        console.log(data);
    });
	playProcess.stdout.on('data', (text) => { console.log(text) });

    playProcess.stdin.setEncoding('utf8');
    playProcess.stdout.setEncoding('utf8');
}

ProjectWindow.open = function(filePath) 
{
    if(!filePath) 
	{
        dialog.showOpenDialog({
            title: "Open project HTML",
            properties: ['openFile'],
            filters: [
                { name: "HTML", extensions: ["html"] }
            ]
        }).then((response) => 
		{ 
			if (response.filePaths && response.filePaths.length)
			{
				filePath = response.filePaths[0];
				addRecentFile(filePath);
				return new ProjectWindow(filePath);		
			}
			else
			{
				return;
			}
		})
    }
	else
	{
		return new ProjectWindow(filePath);		
	}
}

ipc.on("open-file", (event, file) => 
{
	return new ProjectWindow(file)
});

exports.ProjectWindow = ProjectWindow;
