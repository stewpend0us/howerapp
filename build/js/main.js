"use strict";

// objects on the page
const connectbutton = document.getElementById("connectbutton");
const upbutton = document.getElementById("upbutton");
const downbutton = document.getElementById("downbutton");
const updatebutton = document.getElementById("updatebutton");
const statusmessage = document.getElementById("statusmessage");
const mainsection = document.getElementById("mainsection");

// handlers
window.onload = startup;
screen.orientation.onchange = setOrientation;
connectbutton.onclick = askUserToConnect;

function startup() {
  navigator.serviceWorker?.register("./sw.js");
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
  switch (screen.orientation.type) {
    case "landscape-primary": value = "row"; break;
    case "landscape-secondary": value = "row-reverse"; break;
    case "portrait-primary": value = "column"; break;
    case "portrait-secondary": value = "column-reverse"; break;
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

async function askUserToConnect() {
  try {
    BLEDevice = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: ["Itsy"] },
        { namePrefix: ["Hower"] }
      ],
      optionalServices: [UART.service]
    });
    updateStatus("Connecting...");
    BLEDevice.addEventListener("gattserverdisconnected", handleDisconnect);
    GATTServer = await BLEDevice.gatt.connect();
    UARTService = await GATTServer.getPrimaryService(UART.service);
    UARTTx = await UARTService.getCharacteristic(UART.TX);
    UARTRx = await UARTService.getCharacteristic(UART.RX);
    let RxNotifications = await UARTRx.startNotifications();
    RxNotifications.addEventListener("characteristicvaluechanged", handleUartRx);
  }
  catch (err) {
    handleDisconnect(err);
    return;
  }

  updateStatus("Connected.");
  connectbutton.classList.add("hidden");
  upbutton.classList.remove("hidden");
  downbutton.classList.remove("hidden");

}

function handleDisconnect(ev) {
  updateStatus("Device Disconnected.");
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

upbutton.onclick = async (el, ev) => {
  updateStatus("UP");
  await UARTTx.writeValue(str2arraybuffer("Go up!\n"));
}

downbutton.onclick = async (el, ev) => {
  updateStatus("DOWN");
  await UARTTx.writeValue(str2arraybuffer("Go down!\n"));
}

updatebutton.onclick = (el, ev) => {
  updateStatus("UPDATE");
}