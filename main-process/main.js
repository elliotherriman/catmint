const electron = require('electron')
const app = electron.app
const ipc = electron.ipcMain;
const ProjectWindow = require("./projectWindow.js").ProjectWindow;
const appmenus = require('./appmenus.js');

app.on('will-finish-launching', function () {
    app.on("open-file", function (event, path) {
        ProjectWindow.open(path);
        event.preventDefault();
    });
});

let isQuitting = false;

app.on('before-quit', function () {
    // We need this to differentiate between pressing quit (which should quit) or closing all windows
    // (which leaves the app open)
    isQuitting = true;
});

ipc.on("project-cancelled-close", (event) => {
    isQuitting = false;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {

    app.on('window-all-closed', function () {
        if (process.platform != 'darwin' || isQuitting) {
            app.quit();
        }
    });

    appmenus.setupMenus({
        new: () => {
            ProjectWindow.createEmpty();
        },
        open: () => {
            ProjectWindow.open();
        },
        save: () => {
            var win = ProjectWindow.focused();
            if (win) win.save();
        },
    });

	var w = ProjectWindow.createEmpty();
	
    // w.openDevTools();
});

app.on("did-become-active", function() 
{
	if (!ProjectWindow.all().length)
	{ 
		ProjectWindow.createEmpty();
	}
});

app.on("activate", function() 
{
	if (!ProjectWindow.all().length)
	{ 
		ProjectWindow.createEmpty();
	}
});