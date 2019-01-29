const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  TouchBar
} = require("electron");
const fs = require("fs");
const AudioRecorder = require("node-audiorecorder");
const { TouchBarButton } = TouchBar;

const options = {
  program: `sox`, // Which program to use, either `arecord`, `rec`, or `sox`.
  device: null, // Recording device to use.

  bits: 16, // Sample size. (only for `rec` and `sox`)
  channels: 1, // Channel count.
  encoding: `signed-integer`, // Encoding type. (only for `rec` and `sox`)
  format: `S16_LE`, // Encoding type. (only for `arecord`)
  rate: 16000, // Sample rate.
  type: `wav`, // Format type.

  // Following options only available when using `rec` or `sox`.
  silence: 2, // Duration of silence in seconds before it stops recording.
  thresholdStart: 0.5, // Silence threshold to start recording.
  thresholdStop: 0.5, // Silence threshold to stop recording.
  keepSilence: true // Keep the silence in the recording.
};

function createWindow() {
  let audioRecorder = new AudioRecorder(options, console);
  // Create the browser window.
  win = new BrowserWindow({ width: 1600, height: 800 });
  win.toggleDevTools();

  // and load the index.html of the app.
  win.loadURL("http://localhost:4200");

  let touchbarButton = new TouchBarButton({
    icon: "./assets/alfresco.png",
    click: () => {
      const fileStream = fs.createWriteStream("recording.wav", {
        encoding: "binary"
      });

      console.log(fileStream);
      audioRecorder
        .start()
        .stream()
        .pipe(fileStream);

      setTimeout(() => {
        console.log("Ended");
        audioRecorder.stop();
      }, 2000);
    }
  });
  let touchbar = new TouchBar({ items: [touchbarButton] });
  win.setTouchBar(touchbar);
  initUpload();
  initUploadProgress();
  initTouchbar();
}

initTouchbar = () => {};

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
