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

	// debug stuff
	updatebutton.classList.remove("hidden");
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
const EVENT = "characteristicvaluechanged";
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
let dfuObject = undefined;

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
			uart.RX.addEventListener(EVENT, handleUartRx);
			uart.RX.startNotifications();
			return uart;
		})
		.then((uart) => {
			updateStatus("Connected.");
			connectbutton.classList.add("hidden");
			upbutton.classList.remove("hidden");
			downbutton.classList.remove("hidden");
			disconnectbutton.classList.remove("hidden");
		})
		.catch(error => {
			dfu_adapter = connectTo(DFU);
			dfuObject = new Dfu(dfu_adapter);
			return dfu_adapter;
		})
		.then(dfu_adapter => {
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
	let buf = new ArrayBuffer(str.length);
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
	console.log(dfu);
});

disconnectbutton.addEventListener("click", () => {
	GATTServer?.disconnect();
})

/// Dfu class:
function Dfu(adapter) {

	this.total_size = 0;
	this.prn = 0;
	this.adapter = adapter;

	fetch("/firmware/manifest.json")
		.then(response => {
			return response.json();
		})
		.then(manifest => {
			console.log(manifest);
			this.manifest = manifest.manifest;
			this.files = {};

			Promise.allSettled([
				this.get_files("softdevice_bootloader"),
				this.get_files("softdevice"),
				this.get_files("bootloader"),
				this.get_files("application"),
			]);
		})
		.catch(error => {
			console.log("error fetching or processing manifest.json")
			console.log(error);
		})

		adapter.control.addEventListener(EVENT, this.handleControlNotification);
		adapter.control.startNotifications();

		adapter.packet???
}

Dfu.RETRIES_NUMBER = 3;

Dfu.OP_CODE = {
	CreateObject: 0x01,
	SetPRN: 0x02,
	CalcChecSum: 0x03,
	Execute: 0x04,
	ReadObject: 0x06,
	Response: 0x60,
};

Dfu.RES_CODE = {
	InvalidCode: 0x00,
	Success: 0x01,
	NotSupported: 0x02,
	InvalidParameter: 0x03,
	InsufficientResources: 0x04,
	InvalidObject: 0x05,
	InvalidSignature: 0x06,
	UnsupportedType: 0x07,
	OperationNotPermitted: 0x08,
	OperationFailed: 0x0A,
	ExtendedError: 0x0B,
};

Dfu.EXT_ERROR_CODE = [
	"No extended error code has been set. This error indicates an implementation problem.",
	"Invalid error code. This error code should never be used outside of development.",
	"The format of the command was incorrect. This error code is not used in the current implementation, because @ref NRF_DFU_RES_CODE_OP_CODE_NOT_SUPPORTED and @ref NRF_DFU_RES_CODE_INVALID_PARAMETER cover all possible format errors.",
	"The command was successfully parsed, but it is not supported or unknown.",
	"The init command is invalid. The init packet either has an invalid update type or it is missing required fields for the update type (for example, the init packet for a SoftDevice update is missing the SoftDevice size field).",
	"The firmware version is too low. For an application, the version must be greater than or equal to the current application. For a bootloader, it must be greater than the current version. This requirement prevents downgrade attacks.",
	"The hardware version of the device does not match the required hardware version for the update.",
	"The array of supported SoftDevices for the update does not contain the FWID of the current SoftDevice.",
	"The init packet does not contain a signature, but this bootloader requires all updates to have one.",
	"The hash type that is specified by the init packet is not supported by the DFU bootloader.",
	"The hash of the firmware image cannot be calculated.",
	"The type of the signature is unknown or not supported by the DFU bootloader.",
	"The hash of the received firmware image does not match the hash in the init packet.",
	"The available space on the device is insufficient to hold the firmware.",
	"The requested firmware to update was already present on the system.",
];

Dfu.prototype.get_files = function (name) {
	return Promise.all([
		this.get_file(name, "bin_file"),
		this.get_file(name, "dat_file"),
	]);
}

Dfu.prototype.get_file = function (name, type) {
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
		if (response.offset == 0 || response.offset > len(init_packet)) {
			// There is no init packet or present init packet is too long.
			return false;
		}

		expected_crc = (binascii.crc32(init_packet[:response.offset]) & 0xFFFFFFFF);

		if (expected_crc != response.crc) {
			// Present init packet is invalid.
			return false;
		}

		if (len(init_packet) > response.offset) {
			// Send missing part.
			try {
				this.stream_data(data = init_packet[response.offset:],
					crc = expected_crc,
					offset = response.offset);
			}
			catch (err) {
				return false;
			}
		}

		this.execute();
		return true;

	}

	response = this.select_command();
	if (len(init_packet) <= response["max_size"])
		throw "Init command is too long";

	if (try_to_recover())
		return;

	for (r in range(Dfu.RETRIES_NUMBER)) {
		try {
			this.create_command(len(init_packet))
			this.stream_data(data = init_packet)
			this.execute()
			return;
		}
		finally { }
	}
	throw "Failed to send init packet";
}

Dfu.prototype.send_firmware = function (firmware) {
	function try_to_recover() {
		if (response.offset == 0) {
			// Nothing to recover
			return;
		}

		expected_crc = binascii.crc32(firmware[: response.offset]) & 0xFFFFFFFF;
		remainder = response.offset % response.max_size;

		if (expected_crc != response.crc) {
			// Invalid CRC. Remove corrupted data.
			response.offset -= remainder != 0 ? remainder : response.max_size;
			response.crc = binascii.crc32(firmware[: response.offset]) & 0xFFFFFFFF;
			return;
		}

		if ((remainder != 0) && (response.offset != len(firmware))) {
			// Send rest of the page.
			try {
				to_send = firmware[response.offset : response.offset + response.max_size - remainder];
				response.crc = this.stream_data(data = to_send,
					crc = response.crc,
					offset = response.offset);
				response.offset += len(to_send);
			}
			catch (error) {
				// Remove corrupted data.
				response.offset -= remainder;
				response.crc = binascii.crc32(firmware[: response.offset]) & 0xFFFFFFFF;
				return;
			}
		}

		this.execute();
		//	this._send_event(event_type=DfuEvent.PROGRESS_EVENT, progress=response.offset);
	}
	response = this.select_data();
	try_to_recover();

	for (i in range(response.offset, len(firmware), response.max_size)) {
		data = firmware[i: i + response.max_size];
		for (r in range(Dfu.RETRIES_NUMBER)) {
			try {
				this.create_data(len(data));
				response.crc = this.stream_data(data = data, crc = response.crc, offset = i);
				this.execute();
			}
			finally { }
			break;
		}
		throw "Failed to send firmware";
		//	this._send_event(event_type=DfuEvent.PROGRESS_EVENT, progress=len(data))
	}
}

Dfu.prototype.select_command = function () {
	return this.select_object(0x01);
}

Dfu.prototype._select_data = function () {
	return this.select_object(0x02);
}

Dfu.prototype.select_object = function (object_type) {
	console.log(`BLE: Selecting Object: type:${object_type}`);
	let buf = new ArrayBuffer(2);
	let byteView = new Uint8Array(buf,0,2);
	byteView[0] = Dfu.OP_CODE.ReadObject;
	byteView[1] = object_type;
	this.dfu_adapter.write_control_point(buf);
	response = this.get_response(Dfu.OP_CODE.ReadObject);

	(max_size, offset, crc) = struct.unpack('<III', bytearray(response)); // "<III" little endian 3x unsigned int
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

Dfu.prototype.init(this)
{
    this.evt_sync = EvtSync("connected", "disconnected");
    this.notifications_q = queue.Queue();
    this.packet_size = this.att_mtu - 3; // look into "L2CAP" and "MTU"
    // adapter
    this.observer_register(this);
    this.driver.observer_register(this);
}

Dfu.prototype.connect()
{
    console.log("BLE: Enabling Notifications");
    this.enable_notification(uuid = DFUCP_UUID);
}


Dfu.prototype.write_control_point(data)
{
	this.adapter.control.writeValue(data)
	.catch(updateStatus);
}

Dfu.prototype.write_data_point(data)
{
	this.adapter.packet.writeValue(data)
	.catch(updateStatus);
}

Dfu.prototype.on_notification(ble_conn_handle, uuid, data)
{
    if (this.conn_handle != conn_handle)
        return;
    if (DFUCP_UUID.value != uuid.value)
        return;
    this.notifications_q.put(data);
}

Dfu.prototype.open(this)
{
    this.set_prn();
}

Dfu.prototype.set_prn(this)
{
    console.log(`BLE: Set Packet Receipt Notification ${this.prn}`);
		let buf = new ArrayBuffer(1 + 2);
		let byteView = new Uint8Array(buf,0,1);
		let shortView = new Uint16Array(buf,1,1);
		byteView[0] = Dfu.OP_CODE.SetPRN;
		shortView[0] = prn;

//    this.write_control_point([Dfu.OP_CODE.SetPRN] + list(struct.pack("<H", this.prn))); // "<H" -> little endian unsigned short (2 bytes)
	this.write_control_point(buf);
    this.get_response(Dfu.OP_CODE.SetPRN);
}

Dfu.prototype.create_command(size)
{
    this.create_object(0x01, size);
}

Dfu.prototype.create_data(size)
{
    this.create_object(0x02, size);
}

Dfu.prototype.create_object(object_type, size)
{
	let buf = new ArrayBuffer(2 + 4);
	let byteView = new Uint8Array(buf, 0, 2);
	let longView = new Uint32Array(buf, 2, 1);
	byteView[0] = Dfu.OP_CODE.CreateObject;
	byteView[1] = object_type;
	longView[0] = size;
	this.adapter.control.writeValue(buf);
//	this.write_control_point([Dfu.OP_CODE.CreateObject, object_type] + list(struct.pack("<L", size))); // "<L" -> little endian unsignedlong (4 bytes)
    this.get_response(Dfu.OP_CODE.CreateObject);
}

Dfu.prototype.calculate_checksum(this)
{
	let buf = new ArrayBuffer(1);
	let byteView = new Uint8Array(buf,0,1);
	byteView[0] = Dfu.OP_CODE.CalcChecSum;
    this.write_control_point(buf);
    response = this.get_response(Dfu.OP_CODE.CalcChecSum);

    (offset, crc) = struct.unpack("<II", bytearray(response)); // "<II" little endian 2x unsigned int (4 bytes)
    return { offset: offset, crc: crc };
}

Dfu.prototype.execute()
{
	let buf = new ArrayBuffer(1);
	let byteView = new Uint8Array(buf,0,1);
	byteView[0] = Dfu.OP_CODE.Execute;
    this.write_control_point(buf);
    this.get_response(Dfu.OP_CODE.Execute);
}

Dfu.prototype.get_checksum_response(this)
{
    response = this.get_response(Dfu.OP_CODE.CalcChecSum);

    (offset, crc) = struct.unpack("<II", bytearray(response)); // 2x unsigned int (4 bytes)
    return { offset: offset, crc: crc };
}

Dfu.prototype.stream_data(data, crc = 0, offset = 0)
{
    console.log("BLE: Streaming Data: len:{0} offset:{1} crc:0x{2:08X}".format(len(data), offset, crc));
    function validate_crc() {
        if (crc != response.crc)
            throw `Failed CRC validation.\nExpected: ${crc} Received: ${response.crc}.`;
        if (offset != response.offset)
            throw `Failed offset validation.\nExpected: ${offset} Received: ${response.offset}.`;
    }

    current_prn = 0;
    for (i in range(0, len(data), this.dfu_packet_size)) {
        to_transmit = data[i: i + this.dfu_packet_size];
				// TODO ArrayBuffer thing
        this.write_data_point(list(to_transmit));
        crc = binascii.crc32(to_transmit, crc) & 0xFFFFFFFF;
        offset += len(to_transmit);
        current_prn += 1;
        if (this.prn == current_prn) {
            current_prn = 0;
            response = this.get_checksum_response();
            validate_crc();
        }
    }

    response = this.calculate_checksum();
    validate_crc();

    return crc;
}

Dfu.prototype.get_response(operation)
{
    function get_dict_key(dictionary, value) {
        return Object.keys(dictionary).find(key => dictionary[key] === value);
    }

    //    try
    resp = this.dfu_notifications_q.get(timeout = 20)
    //    catch (queue.Empty)
    //        raise NordicSemiException("Timeout: operation - {}".format(get_dict_key(Dfu.OP_CODE,operation)))

    if (resp[0] != Dfu.OP_CODE.Response)
        throw `No Response: 0x${resp[0].toString(16)}`;

    if (resp[1] != operation)
        throw `Unexpected Executed OP_CODE.\nExpected: 0x${operation.toString(16)} Received: 0x${resp[1].toString(16)}`;

    if (resp[2] == DfuTransport.RES_CODE.Success) {
        return resp[3:];
    }
    else if (resp[2] == DfuTransport.RES_CODE.ExtendedError) {
        try {
            data = DfuTransport.EXT_ERROR_CODE[resp[3]];
        }
        catch (err) {
            data = `Unsupported extended error type ${resp[3]}`;
        }
        throw `Extended Error 0x{resp[3].toString(16)}: ${data}`;
    }
    else {
        throw `Response Code ${get_dict_key(DfuTransport.RES_CODE, resp[2])}`;
    }
}