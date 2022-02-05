window.onload = () => {
  'use strict';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js');
  }

}

let connectbutton = document.getElementById("connectbutton");
let statusmessage = document.getElementById("statusmessage");

function updateStatus(e) {
    console.log(e);
    statusmessage.innerText = e.message;
}

function arraybuffer2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2arraybuffer(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

connectbutton.onclick = async (el, ev) => {
  try {
    let device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: ['Itsy'] },
        { namePrefix: ['Hower'] }
      ],
      optionalServices: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"]
    });
    let server = await device.gatt.connect();
    let service = await server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
    let characteristic = await service.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
//    let descriptor = await characteristic.getDescriptor(0x2901);

    console.log(device);
    console.log(server);
    console.log(characteristic);
//    console.log(descriptor);

    await characteristic.writeValue(str2arraybuffer("hidey hoooo!"));
  }
  catch (e)
  {
    updateStatus(e);
  }

};