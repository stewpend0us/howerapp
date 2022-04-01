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
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("./sw.js")
			.catch(err => {
				updateStatus(err);
			});
	}
	if ("bluetooth" in navigator) {
	}
	else {
		updateStatus("no bluetooth :(");
	}
	setOrientation();
}

// general stuff
function updateStatus(e) {
	console.log(e);
	statusmessage.textContent += "\n" + (e.message ?? String(e));
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
	name: "UART",
	service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
	TX: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
	RX: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
};

const DFU = {
	name: "DFU",
	service: "00001530-1337-eabb-2845-bee366ecee5a",
	control: "00001531-1337-eabb-2845-bee366ecee5a",
	packet: "00001532-1337-eabb-2845-bee366ecee5a",
	version: "00001534-1337-eabb-2845-bee366ecee5a"
};

function connectTo(obj) {
	let result = {
		name: obj.name,
	};
	let promises = [];
	GATTServer?.getPrimaryService(obj.service)
		.then(service => {
			updateStatus("Got " + obj.name );
			result.service = service;
			for (const prop in obj) {
				if (prop === "service" || prop === "name") {
					continue;
				}
				promises.push(service.getCharacteristic(obj[prop])
					.then(char => {
						updateStatus("Got " + obj.name + "." + prop + " characteristic");
						result[prop] = char;
					})
					.catch(error => {
						updateStatus("No " + obj.name + "." + prop + " characteristic?");
						updateStatus(error);
					}));
			}
			//Promise.allSettled(promises);
			return result;
		})
		.catch(error => {
			updateStatus("no " + obj.name + " service?");
			updateStatus(error);
		});
}

let BLEDevice = undefined;
let GATTServer = undefined;
let uart = undefined;
let dfu = undefined;

function askUserToConnect() {

	puseragent.textContent = window.navigator.userAgent;
	const options = {
		acceptAllDevices: false,
		filters: [
			{ namePrefix: "Itsy" },
			{ namePrefix: "AdaDFU" },
			{ namePrefix: "Hower" },
			{ services: [UART.service] },
			{ services: [DFU.service] },
		],
	};

	navigator.bluetooth?.requestDevice(options)
		.then(device => {
			BLEDevice = device;
			updateStatus("Connected to " + device.name);
			BLEDevice.addEventListener("gattserverdisconnected", handleDisconnect);
			return BLEDevice.gatt.connect();
		})
		.then(server => {
			updateStatus("Connected to Gatt.");
			GATTServer = server;
			return server;
		})
		.then(server => {
			uart = connectTo(UART);
			dfu = connectTo(DFU);
			uart.RX.addEventListener("characteristicvaluechanged", handleUartRx);
			uart.RX.startNotifications();
		})
		.finally(() => {
			updateStatus("Connected.");
			connectbutton.classList.add("hidden");
			upbutton.classList.remove("hidden");
			downbutton.classList.remove("hidden");
			disconnectbutton.classList.remove("hidden");
		});
}

function handleDisconnect(ev) {
	updateStatus("Disconnect Event");
	BLEDevice = undefined;
	GATTServer = undefined;
	uart = undefined;
	dfu = undefined;

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
	uart?.TX?.writeValue(str2arraybuffer("Go up!\n"))
		.catch(updateStatus);
});

upbutton.addEventListener("pointerup", () => {
	updateStatus("...");
	uart?.TX?.writeValue(str2arraybuffer("no more go up\n"))
		.catch(updateStatus);
});

downbutton.addEventListener("pointerdown", () => {
	updateStatus("DOWN");
	uart?.TX?.writeValue(str2arraybuffer("Go down!\n"))
		.catch(updateStatus);
});

downbutton.addEventListener("pointerup", () => {
	updateStatus("...");
	uart?.TX?.writeValue(str2arraybuffer("no more go down\n"))
		.catch(updateStatus);
});

updatebutton.addEventListener("click", () => {
	updateStatus("UPDATE");
});

disconnectbutton.addEventListener("click", () => {
	GATTServer?.disconnect();
})
