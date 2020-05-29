const { app, BrowserWindow, Menu, Tray ,ipcMain} = require('electron')
const url = require('url')
const path = require('path')
var win = null;
const RefreshRouterStatusEveryMiliseconds = 10000;
const RouterGateway = '192.168.8.1';
const ShowAppWindow = false;

var IsConnectedToInternet =  false;

//event from index.html script for checking network
ipcMain.on('online-status-changed', (event, status) => {
  if(status =="online")
  {
    IsConnectedToInternet = true;
  }
  else
  {
    IsConnectedToInternet = false;
  } 
  console.log("IsConnected: " + IsConnectedToInternet);

})

function ShowNotification(Title, Description, ImagePath = '') {
  const notifier = require('node-notifier')
  const path = require('path');


  notifier.notify({
    title: Title,
    message: Description,
    icon: path.join('', ImagePath),  // Absolute path (doesn't work on balloons)
    sound: true,  // Only Notification Center or Windows Toasters
    wait: true    // Wait with callback, until user action is taken against notification

  }, function (err, response) {
    // Response is response from notification
  });

  notifier.on('click', function (notifierObject, options) {
    console.log("You clicked on the notification")
  });

  notifier.on('timeout', function (notifierObject, options) {
    console.log("Notification timed out!")
  });

}

function GetSignalStrength(RouterResponse) {
  var MaximumSiganl = RouterResponse.maxsignal[0];
  var CurrentSiganl = RouterResponse.SignalIcon[0];

  return "Signal: (" + CurrentSiganl + "/" + MaximumSiganl + ")";
}

function createWindow() {

  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
    ,show: ShowAppWindow // start minimized (in tray) if false
  })

  win.setSkipTaskbar(true);
  // load the index.html of the app.
  win.loadFile('Views/index.html')

  win.on('close', function (event) {
    // event.preventDefault();
    // win.hide();
  })
  
  win.on('minimize', function (event) {
    event.preventDefault()
    win.hide()
  })


  let AppTray = null;
  const iconPath = 'Assets/Images/BatteryIcons/UnknownBattery.png';
  AppTray = new Tray(iconPath);

  var contextMenu = Menu.buildFromTemplate([
    { label: 'Quit',
      accelerator: 'Command+Q',
      selector: 'terminate:',
    }
  ]);
  AppTray.setContextMenu(contextMenu);

  AppTray.setToolTip('This is huwai router utility for monitoring battery, signal, and other info.');


  ShowNotification("Unofficial Huawei Router Utility started", "Utility started and will be on system tray/top menu", "");

  var router = require('dialog-router-api').create({
    gateway: RouterGateway
    // The IP address of your router, can be found by doing
    // ipconfig on windows or netstat -r on linux (right under 'Gateway')
  });

  var LowBatteryNotificationShowed = false;


  const intervalObj = setInterval(() => {

    if(IsConnectedToInternet)
    {
      router.getToken(function (error, token) {
        router.getStatus(token, function (error, response) {
          var SgianlStrengthString = GetSignalStrength(response);
  
          //if charging
          if (response.BatteryStatus[0] == '1') {
            console.log('Battery is charging');
            let iconPath = 'Assets/Images/BatteryIcons/ChargingBattery.png';
            AppTray.setImage(iconPath);
            if (response.BatteryPercent[0]) {
              AppTray.setToolTip('Router is charging (' + response.BatteryPercent[0] + '%)\n' + SgianlStrengthString);
              AppTray.setTitle(response.BatteryPercent[0] + '%');
            }
            else {
              AppTray.setToolTip('Unknown battery level or device has no battery\n' + SgianlStrengthString);
              let iconPath = 'Assets/Images/BatteryIcons/UnknownBattery.png';
              AppTray.setImage(iconPath);
            }
          }
          //not charging
          else {
            //known battery level
            if (response.BatteryPercent[0]) {
              var BatteryLevelNumber = parseInt(response.BatteryPercent[0]);
              let iconPath = 'Assets/Images/BatteryIcons/UnknownBattery.png';
  
              if (BatteryLevelNumber >= 75) {
                iconPath = 'Assets/Images/BatteryIcons/FullBattery.png';
              }
              else if (BatteryLevelNumber >= 50) {
                iconPath = 'Assets/Images/BatteryIcons/AboveMediumBattery.png';
              }
              else if (BatteryLevelNumber >= 25) {
                iconPath = 'Assets/Images/BatteryIcons/MediumBattery.png';
              }
              else {
                iconPath = 'Assets/Images/BatteryIcons/LowBattery.png';
  
                LowBatteryNotificationShowed = true;
              }
  
              if (BatteryLevelNumber > 25) {
                LowBatteryNotificationShowed = false;
              }
              AppTray.setImage(iconPath);
              AppTray.setToolTip('Battery level: (' + response.BatteryPercent[0] + '%)\n' + SgianlStrengthString);
              AppTray.setTitle(response.BatteryPercent[0] + '%');
            }
            //Unknown battery level
            else {
              AppTray.setToolTip('Router is with unknown battery level or device has no battery');
              let iconPath = 'Assets/Images/BatteryIcons/UnknownBattery.png';
              AppTray.setImage(iconPath);
            }
          }
  
        });
      });
    }
    else
    {
      AppTray.setToolTip('please check your internet connection');
      AppTray.setTitle('Not Connected');
      let iconPath = 'Assets/Images/BatteryIcons/UnknownBattery.png';
      AppTray.setImage(iconPath);
    }
  
  }, RefreshRouterStatusEveryMiliseconds)


}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

//Hide app from the dock
app.dock.hide();



// Quit when all windows are closed.
// app.on('window-all-closed', () => {
//   // On macOS it is common for applications and their menu bar
//   // to stay active until the user quits explicitly with Cmd + Q
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

// app.on('activate', () => {
//   // On macOS it's common to re-create a window in the app when the
//   // dock icon is clicked and there are no other windows open.
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow()
//   }
// })




// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
