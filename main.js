const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  TouchBar
} = require("electron");
const { TouchBarButton } = TouchBar;

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
      console.log("Click");

      win.webContents.send("takeImage");
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
