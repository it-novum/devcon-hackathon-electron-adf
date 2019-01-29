const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  ipcRenderer,
  TouchBar
} = require("electron");
const fs = require("fs");
const AudioRecorder = require("node-audiorecorder");
const { TouchBarButton } = TouchBar;
const options = {
  program: `sox`, // Which program to use, either `arecord`, `rec`, or `sox`.
  silence: 2,
  device: "default",
  threshold: 0.35 // Recording device to use.
};

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 1600, height: 800 });
  win.toggleDevTools();

  // and load the index.html of the app.
  win.loadURL("http://localhost:4200");

  initUpload();
  initUploadProgress();
  initTouchbar();
}

initTouchbar = () => {
  let touchbarButton = new TouchBarButton({
    icon: "./assets/alfresco.png",
    click: () => {
      win.webContents.send("startRecording");
    }
  });
  let touchbar = new TouchBar({ items: [touchbarButton] });
  win.setTouchBar(touchbar);
};

initUpload = () => {
  ipcMain.on("upload", (event, args) => {
    let uploadNotification = new Notification({
      title: "Upload complete!",
      subtitle: 'File "' + args[0].name + "' has been uploaded succesfully."
    });
    uploadNotification.show();
    win.setProgressBar(-1);
  });
};
initUploadProgress = () => {
  ipcMain.on("uploadProgress", (event, args) => {
    win.setProgressBar(args[0].progress / 100);
  });
};

app.on("ready", createWindow);
