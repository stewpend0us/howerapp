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
	updatebutton.classList.remove("hidden");
	return;
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
			updateStatus("Got " + obj.name);
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
			uart.RX.addEventListener("characteristicvaluechanged", handleUartRx);
			uart.RX.startNotifications();
		})
		.then(() => {
			updateStatus("Connected.");
			connectbutton.classList.add("hidden");
			upbutton.classList.remove("hidden");
			downbutton.classList.remove("hidden");
			disconnectbutton.classList.remove("hidden");
		})
		.catch(error => {
			dfu = connectTo(DFU);
			connectbutton.classList.add("hidden");
			updatebutton.classList.remove("hidden");
		})
		.catch(error => {
			updateStatus("welp that's not good.");
			updateStatus(error);
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
	const dfu = new Dfu(null);
	console.log(dfu);
});

disconnectbutton.addEventListener("click", () => {
	GATTServer?.disconnect();
})

/// Dfu class:
function Dfu() {
	/*
	Initializes the dfu upgrade, unpacks zip and registers callbacks.

	@param zip_file_path{ Path to the zip file with the firmware to upgrade
	@type zip_file_path{ str
	@param connect_delay{ Delay in seconds before each connection to the DFU target
	@type connect_delay{ int
	@return
	*/
	this.total_size = 0;
	fetch("/firmware/manifest.json")
		.then(response => {
			return response.json();
		})
		.then(manifest => {
			console.log(manifest);
			this.manifest = manifest.manifest;
			this.files = {};


			Promise.allSettled([
				this._get_files("softdevice_bootloader"),
				this._get_files("softdevice"),
				this._get_files("bootloader"),
				this._get_files("application"),
			]);
		})
}

Dfu.prototype._get_files = function (name) {
	return Promise.all([
		this._get_file(name, "bin_file"),
		this._get_file(name, "dat_file"),
	]);
}

Dfu.prototype._get_file = function (name, type) {
	// append name to this with the contents of the file as a blob
	if (name in this.manifest) {
		const wanted = "firmware/" + this.manifest[name][type];
		updateStatus("fetching " + wanted);
		return fetch(wanted)
			.then(response => {
				if (response.ok)
					return response.blob();
				else
					throw "response not ok"
			})
			.then(data => {
				if (!(name in this.files)) {
					this.files[name] = {};
				}
				this.files[name][type] = data;
				if (type === "dat_file") {
					this.total_size += data.size
				}
				updateStatus("fetched " + wanted);
			})
			.catch(error => {
				updateStatus("failed to get " + wanted);
				updateStatus(error);
			});
	}
}

Dfu.prototype._dfu_send_image = function (firmware) {
	start_time = Date.now();

	updateStatus("Sending init packet...");
	this.send_init_packet(this.files[firmware].dat_file);

	updateStatus("Sending firmware file...");
	this.send_firmware(this.files[firmware].bin_file);

	end_time = Date.now();
	updateStatus(`Image sent in ${end_time - start_time}`);
}

Dfu.prototype.send_init_packet = function (init_packet) {
	function try_to_recover() {
		if (response['offset'] == 0 || response['offset'] > len(init_packet)) {
			// There is no init packet or present init packet is too long.
			return false;
		}

		expected_crc = (binascii.crc32(init_packet[: response['offset']]) & 0xFFFFFFFF);

		if (expected_crc != response['crc']) {
			// Present init packet is invalid.
			return false;
		}

		if (len(init_packet) > response['offset']) {
			// Send missing part.
			try {
				this.__stream_data(data = init_packet[response['offset']:],
					crc = expected_crc,
					offset = response['offset']);
			}
			catch (ValidationException) {
				return false;
			}
		}

		this.__execute();
		return true;

	}

	response = this.__select_command();
	if (len(init_packet) <= response["max_size"])
		throw "Init command is too long";

	if (try_to_recover())
		return;

	for (r in range(DfuTransportBle.RETRIES_NUMBER)) {
		try {
			this.__create_command(len(init_packet))
			this.__stream_data(data = init_packet)
			this.__execute()
			return;
		}
		finally { }
	}
	throw "Failed to send init packet";
}

Dfu.prototype.send_firmware = function (firmware) {
	function try_to_recover() {
		if (response['offset'] == 0) {
			// Nothing to recover
			return;
		}

		expected_crc = binascii.crc32(firmware[: response['offset']]) & 0xFFFFFFFF;
		remainder = response['offset'] % response['max_size'];

		if (expected_crc != response['crc']) {
			// Invalid CRC. Remove corrupted data.
			response['offset'] -= remainder != 0 ? remainder : response['max_size'];
			response['crc'] = binascii.crc32(firmware[: response['offset']]) & 0xFFFFFFFF;
			return;
		}

		if ((remainder != 0) && (response['offset'] != len(firmware))) {
			// Send rest of the page.
			try {
				to_send = firmware[response['offset'] : response['offset'] + response['max_size'] - remainder];
				response['crc'] = this.__stream_data(data = to_send,
					crc = response['crc'],
					offset = response['offset']);
				response['offset'] += len(to_send);
			}
			catch (error) {
				// Remove corrupted data.
				response['offset'] -= remainder;
				response['crc'] = binascii.crc32(firmware[: response['offset']]) & 0xFFFFFFFF;
				return;
			}
		}

		this.__execute();
		//	this._send_event(event_type=DfuEvent.PROGRESS_EVENT, progress=response['offset']);
	}
	response = this.__select_data();
	try_to_recover();

	for (i in range(response['offset'], len(firmware), response['max_size'])) {
		data = firmware[i: i + response['max_size']];
		for (r in range(DfuTransportBle.RETRIES_NUMBER)) {
			try {
				this.__create_data(len(data));
				response['crc'] = this.__stream_data(data = data, crc = response['crc'], offset = i);
				this.__execute();
			}
			finally { }
			break;
		}
		throw "Failed to send firmware";
		//	this._send_event(event_type=DfuEvent.PROGRESS_EVENT, progress=len(data))
	}
}

Dfu.prototype.__select_command = function () {
	return this.__select_object(0x01);
}

Dfu.prototype._select_data = function () {
	return this.__select_object(0x02);
}

Dfu.prototype.__select_object = function (object_type) {
	console.log(`BLE: Selecting Object: type:${object_type}`);
	this.dfu_adapter.write_control_point([DfuTransportBle.OP_CODE['ReadObject'], object_type]);
	response = this.__get_response(DfuTransportBle.OP_CODE['ReadObject']);

	(max_size, offset, crc) = struct.unpack('<III', bytearray(response));
	console.log(`BLE: Object selected: max_size:${max_size} offset:${offset} crc:${crc}`);
	return { "max_size": max_size, "offset": offset, "crc": crc };
}

Dfu.prototype.dfu_send_images = function () {
	/*
	Does DFU for all firmware images in the stored manifest.
	*/
	if (this.files.softdevice_bootloader) {
		updateStatus("Sending SoftDevice+Bootloader image...")
		this._dfu_send_image("softdevice_bootloader");
	}

	if (this.files.softdevice) {
		updateStatus("Sending SoftDevice image...");
		this._dfu_send_image("softdevice");
	}

	if (this.files.bootloader) {
		updateStatus("Sending Bootloader image...");
		this._dfu_send_image("bootloader");
	}

	if (this.files.application) {
		updateStatus("Sending Application image...");
		this._dfu_send_image("application");
	}
}

Dfu.prototype.dfu_get_total_size = () => this.total_size;
