const electron = require('electron')
const app = electron.app
const ipc = electron.ipcMain;
const dialog = electron.dialog;
const _ = require("lodash");
const Menu = electron.Menu;
const ProjectWindow = require("./projectWindow.js").ProjectWindow;
const shell = require('electron').shell;
const path = require('path');
// const extensions = require("../extensions/appMenu.js").snippets;


function setupMenus(callbacks) {

    function computeRecent(newRecentFiles) {
        return newRecentFiles.map((path) => ({
            label: path,
            click: () => { ProjectWindow.open(path) }
        }));
    }
    
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+N',
                    click: callbacks.new
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Open...',
                    accelerator: 'CmdOrCtrl+O',
                    click: callbacks.open
                },
                {
                    label: 'Open Recent',
                    submenu: computeRecent(ProjectWindow.getRecentFiles()),
                    id: "recent"
                },
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                },
                {
                    label: 'Select All',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectall'
                },
                {
                    type: 'separator'
                }
            ]
        },
		{
            label: 'Window',
            role: 'window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
                },
                {
                    label: 'Close',
                    accelerator: 'CmdOrCtrl+W',
                    role: 'close'
                },
				{
                    label: 'Toggle Full Screen',
                    accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
                    click(item, focusedWindow) {
                        if (focusedWindow)
                            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                    }
                },
                {
                    type: 'separator'
                },						
                {
					label: 'Reload HTML',
					accelerator: 'CmdOrCtrl+R',
					click(item, focusedWindow) {
						focusedWindow.reload();
					}
				},
				{
					label: 'Toggle Developer Tools',
					accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
					click(item, focusedWindow) {
						if (focusedWindow)
							focusedWindow.webContents.toggleDevTools();
					}
				},
            ]
        },
    ];

    const name = app.getName();
    const aboutWindowLabel = 'About ' + name;
    // Mac specific menus
    if (process.platform === 'darwin') {
        template.unshift({
            label: name,
            submenu: [
                {
                    label: aboutWindowLabel,
                    click: callbacks.showAbout
                    // role: 'about'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Services',
                    role: 'services',
                    submenu: []
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Hide ' + name,
                    accelerator: 'Command+H',
                    role: 'hide'
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Command+Alt+H',
                    role: 'hideothers'
                },
                {
                    label: 'Show All',
                    role: 'unhide'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click() { app.quit(); }
                },
            ]
        });

        var windowMenu = _.find(template, menu => menu.role == "window");
        windowMenu.submenu.push(
            {
                type: 'separator'
            },
            {
                label: 'Bring All to Front',
                role: 'front'
            }
        );
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    ProjectWindow.setRecentFilesChanged(function(newRecentFiles) {
        _.find(
            _.find(template, menu => menu.label == "File").submenu,
            submenu => submenu.id == "recent"
        ).submenu = computeRecent(newRecentFiles);
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    });
}

exports.setupMenus = setupMenus;
