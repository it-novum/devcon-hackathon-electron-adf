const { app, BrowserWindow, Notification } = require("electron");

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 800, height: 600 });
  win.toggleDevTools();

  // and load the index.html of the app.
  win.loadURL("http://localhost:4200");

  let uploadNotification = new Notification("Uploaded completed!", {
    body: "The document has been uploaded!"
  });
}

app.on("ready", createWindow);
