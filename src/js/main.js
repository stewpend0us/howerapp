"use strict";

// objects on the page
const connectbutton = document.getElementById("connectbutton");
const disconnectbutton = document.getElementById("disconnectbutton");
const upbutton = document.getElementById("upbutton");
const downbutton = document.getElementById("downbutton");
const updatebutton = document.getElementById("updatebutton");
const statusmessage = document.getElementById("statusmessage");
const mainsection = document.getElementById("mainsection");
const puseragent = document.getElementById("useragent");

// handlers
window.addEventListener("load", startup);
if (screen.orientation) {
  screen.orientation.addEventListener("change", setOrientation);
}
else {
  window.addEventListener("orientationchange", setOrientation);
}
connectbutton.addEventListener("click", askUserToConnect);

function startup() {
  if ("serviceWorker" in navigator)
  {
    navigator.serviceWorker?.register("./sw.js")
    .catch(err =>{
    updateStatus("no service worker :(");
    });
  }
  if ("bluetooth" in navigator)
  {
  }
  else
  {
    updateStatus("no bluetooth :(");
  }
  setOrientation();
}

// general stuff
function updateStatus(e) {
  console.log(e);
  statusmessage.textContent = e.message ?? String(e);
}

// change layout depending on orientation
function setOrientation() {
  let value = "";
  switch (screen.orientation?.angle ?? window.orientation) {
    case 90: value = "row"; break;
    case -90:
    case 270: value = "row-reverse"; break;
    case 0: value = "column"; break;
    case 180: value = "column-reverse"; break;
    default: console.log(screen.orientation.type); return;
  }
  mainsection.style.flexDirection = value;
}

// bluetooth stuff
const UART = {
  service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  TX: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  RX: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  //  descriptor:0x2901
};

let BLEDevice = undefined;
let GATTServer = undefined;
let UARTService = undefined;
let UARTRx = undefined;
let UARTTx = undefined;

function askUserToConnect() {

  puseragent.textContent = window.navigator.userAgent;
  const options = {
    acceptAllDevices: false,
    filters: [
      { namePrefix: "Itsy" },
      { namePrefix: "Hower" },
      { services: [UART.service] }
    ],
  };

  navigator.bluetooth.requestDevice(options)
    .then(device => {
      BLEDevice = device;
      updateStatus("Connecting...");
      BLEDevice.addEventListener("gattserverdisconnected", handleDisconnect);
      return BLEDevice.gatt.connect();
    })
    .then(server => {
      updateStatus("Connected.");
      GATTServer = server;
      return GATTServer.getPrimaryService(UART.service);
    })
    .then(service => {
      updateStatus("Getting UART Service.");
      UARTService = service;
      return UARTService.getCharacteristic(UART.TX);
    })
    .then(char => {
      updateStatus("Getting Tx characteristic.");
      UARTTx = char;
      return UARTService.getCharacteristic(UART.RX);
    })
    .then(char => {
      updateStatus("Listening for Rx notifications.");
      UARTRx = char;
      UARTRx.addEventListener("characteristicvaluechanged", handleUartRx);
      UARTRx.startNotifications();
      return;
    })
    .then(() => {
      updateStatus("Connected.");
      connectbutton.classList.add("hidden");
      upbutton.classList.remove("hidden");
      downbutton.classList.remove("hidden");
      disconnectbutton.classList.remove("hidden");
      return;
    })
    .catch(handleDisconnect);
}

function handleDisconnect(ev) {
  updateStatus(ev);
  BLEDevice = undefined;
  GATTServer = undefined;
  UARTService = undefined;
  UARTRx = undefined;
  UARTTx = undefined;

  connectbutton.classList.remove("hidden");
  upbutton.classList.add("hidden");
  downbutton.classList.add("hidden");
  disconnectbutton.classList.add("hidden");
}

function handleUartRx(ev) {
  ev.message = arraybuffer2str(ev.currentTarget.value.buffer);
  updateStatus(ev);
}

// https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
// look into "TextEncoder"?
function arraybuffer2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function str2arraybuffer(str) {
  let buf = new ArrayBuffer(str.length); // 2 bytes for each char
  let bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

upbutton.addEventListener("pointerdown", () => {
  updateStatus("UP");
  UARTTx?.writeValue(str2arraybuffer("Go up!\n"))
    .catch(updateStatus);
});

upbutton.addEventListener("pointerup", () => {
  updateStatus("...");
  UARTTx?.writeValue(str2arraybuffer("no more go up\n"))
    .catch(updateStatus);
});

downbutton.addEventListener("pointerdown", () => {
  updateStatus("DOWN");
  UARTTx?.writeValue(str2arraybuffer("Go down!\n"))
    .catch(updateStatus);
});

downbutton.addEventListener("pointerup", () => {
  updateStatus("...");
  UARTTx?.writeValue(str2arraybuffer("no more go down\n"))
    .catch(updateStatus);
});

updatebutton.addEventListener("click", () => {
  updateStatus("UPDATE");
});

disconnectbutton.addEventListener("click", () => {
  GATTServer?.disconnect();
})