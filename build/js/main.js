"use strict";

window.onload = startup;

// objects on the page
const connectbutton = document.getElementById("connectbutton");
const upbutton = document.getElementById("upbutton");
const downbutton = document.getElementById("downbutton");
const updatebutton = document.getElementById("updatebutton");
const statusmessage = document.getElementById("statusmessage");
const mainsection = document.getElementById("mainsection");

// handlers
screen.orientation.onchange = setOrientation;
connectbutton.onclick = askUserToConnect;

function startup() {
  // start the service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js');
  }

  setOrientation();
}

// general stuff
function updateStatus(e) {
  console.log(e);
  if (typeof(e) === "string")
  {
    statusmessage.textContent = e;
    return;
  }
  if ("message" in e)
  {
    statusmessage.textContent = e.message;
    return;
  }

}

// change layout depending on orientation
function setOrientation() {
  console.log(screen.orientation.type);
  switch (screen.orientation.type) {
    case 'landscape-primary':
      mainsection.style.flexDirection = "row";
      break;
    case 'landscape-secondary':
      mainsection.style.flexDirection = "row-reverse";
      break;
    case 'portrait-primary':
    case 'portrait-secondary':
      mainsection.style.flexDirection = "column";
      break;
  }
}

// bluetooth stuff
let device = undefined;
let gattServer = undefined;
let uartService = undefined;
let uartRx = undefined;
let uartTx = undefined;

async function askUserToConnect() {
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: ['Itsy'] },
        { namePrefix: ['Hower'] }
      ],
      optionalServices: [UART.service]
    });
    updateStatus("Connecting...");
    gattServer = await device.gatt.connect();
    uartService = await gattServer.getPrimaryService(UART.service);
    uartTx = await uartService.getCharacteristic(UART.TX);
    uartRx = await uartService.getCharacteristic(UART.RX);
    let RxNotifications = await uartRx.startNotifications();
    RxNotifications.addEventListener('characteristicvaluechanged', handleUartRx);
  }
  catch (e)
  {
    gattServer = undefined;
    device = undefined;
    updateStatus(e);
    return;
  }

  updateStatus("Connected.");
  connectbutton.classList.toggle("hidden");
  upbutton.classList.toggle("hidden");
  downbutton.classList.toggle("hidden");

}

function checkConnection() {
  if (gattServer && gattServer.connected)
    return true;
  
  connectbutton.classList.toggle("hidden");
  upbutton.classList.toggle("hidden");
  downbutton.classList.toggle("hidden");
  return false;
}

function handleUartRx(ev) {
  ev.message = arraybuffer2str(ev.currentTarget.value.buffer);
  updateStatus(ev);
}

// https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function arraybuffer2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function str2arraybuffer(str) {
  let buf = new ArrayBuffer(str.length); // 2 bytes for each char
  let bufView = new Uint8Array(buf);
  for (let i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

const UART = {
  service:"6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  TX:"6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  RX:"6e400003-b5a3-f393-e0a9-e50e24dcca9e",
//  descriptor:0x2901
};



/*{
//    let descriptor = await characteristic.getDescriptor(UART.descriptor);

    console.log(device);
    console.log(server);
    console.log(characteristic);
//    console.log(descriptor);

  }
  catch (e)
  {
    updateStatus(e);
  }
};*/

upbutton.onclick = async (el, ev) => {
  if (checkConnection()) {
    updateStatus("UP");
    await uartTx.writeValue(str2arraybuffer("Go up!\n"));
  }
}

downbutton.onclick = async (el,ev) => {
  if (checkConnection()) {
    updateStatus("DOWN");
    await uartTx.writeValue(str2arraybuffer("Go down!\n"));
  }
}

updatebutton.onclick = (el, ev) => {
  updateStatus("UPDATE");
}