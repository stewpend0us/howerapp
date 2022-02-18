"use strict";

// objects on the page
const connectbutton = document.getElementById("connectbutton");
const upbutton = document.getElementById("upbutton");
const downbutton = document.getElementById("downbutton");
const updatebutton = document.getElementById("updatebutton");
const statusmessage = document.getElementById("statusmessage");
const mainsection = document.getElementById("mainsection");
const puseragent = document.getElementById("useragent");

// handlers
//window.addEventListener("load", startup);
if (screen.orientation) {
  screen.orientation.addEventListener("change", setOrientation);
}
else {
  window.addEventListener("orientationchange", setOrientationIOS);
}
connectbutton.addEventListener("click", askUserToConnect);
/*
function startup() {
  alert("hi");
  navigator.serviceWorker?.register("./sw.js");
  alert("there");
  setOrientation();
}

*/
// general stuff
function updateStatus(e) {
  console.log(e);
  statusmessage.textContent = e.message ?? String(e);
  alert(statusmessage.textContent);
}

// change layout depending on orientation
function setOrientation() {
  let value = "";
  updateStatus(screen.orientation.angle);
  switch (screen.orientation.type) {
    case "landscape-primary": value = "row"; break;
    case "landscape-secondary": value = "row-reverse"; break;
    case "portrait-primary": value = "column"; break;
    case "portrait-secondary": value = "column-reverse"; break;
    default: console.log(screen.orientation.type); return;
  }
  mainsection.style.flexDirection = value;
}

function setOrientationIOS() {
  updateStatus(window.orientation);
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
  alert("button");

  puseragent.textContent = window.navigator.userAgent;
  const options = {
    acceptAllDevices: false,
    filters: [
      { namePrefix: "Itsy" },
      { namePrefix: "Hower" }
    ],
    services: [UART.service]
  };

  navigator.bluetooth.requestDevice(options).then(device => {
    BLEDevice = device;
    updateStatus("Connecting...");
    BLEDevice.addEventListener("gattserverdisconnected", handleDisconnect);
    BLEDevice.gatt.connect().then(server => {
      GATTServer = server;
      GATTServer.getPrimaryService(UART.service).then(service => {
        UARTService = service;
        UARTService.getCharacteristic(UART.TX).then(char => {
          UARTTx = char;
        }).then(() => {
          UARTService.getCharacteristic(UART.RX).then(char => {
            UARTRx = char;
            UARTRx.startNotifications().then(notification => {
              RxNotifications = notification;
              RxNotifications.addEventListener("characteristicvaluechanged", handleUartRx);
            }).then(() => {
              updateStatus("Connected.");
              connectbutton.classList.add("hidden");
              upbutton.classList.remove("hidden");
              downbutton.classList.remove("hidden");
            });
          });
        });
      });
    });
  }).catch(handleDisconnect);
  updateStatus("Connected.");
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

upbutton.addEventListener("click", () => {
  updateStatus("UP");
  //await UARTTx.writeValue(str2arraybuffer("Go up!\n"));
});

downbutton.addEventListener("click", () => {
  updateStatus("DOWN");
  //await UARTTx.writeValue(str2arraybuffer("Go down!\n"));
});

updatebutton.addEventListener("click", () => {
  updateStatus("UPDATE");
});

