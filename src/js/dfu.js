//
// Copyright (c) 2016 Nordic Semiconductor ASA
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met{
//
//   1. Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
//
//   2. Redistributions in binary form must reproduce the above copyright notice, this
//   list of conditions and the following disclaimer in the documentation and/or
//   other materials provided with the distribution.
//
//   3. Neither the name of Nordic Semiconductor ASA nor the names of other
//   contributors to this software may be used to endorse or promote products
//   derived from this software without specif (ic prior written permission.
//
//   4. This software must only be used in or with a processor manufactured by Nordic
//   Semiconductor ASA, or in or with a processor manufactured by a third party that
//   is used in combination with a processor manufactured by Nordic Semiconductor.
//
//   5. Any software provided in binary or object form under this license must not be
//   reverse engineered, decompiled, modified and/or disassembled.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN if ( ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

/*
"manifest": {
	"application": {
		"bin_file": "bleuart.ino.bin",
		"dat_file": "bleuart.ino.dat",
		"init_packet_data": {
			"application_version": 4294967295,
			"device_revision": 65535,
			"device_type": 82,
			"firmware_crc16": 58587,
			"softdevice_req": [
				182
			]
		}
	},
	"dfu_version": 0.5
}
*/

/* Class to handle upload of a new hex image to the device. */
function Dfu(dfu_transport, connect_delay) {
	/*
	Initializes the dfu upgrade, unpacks zip and registers callbacks.

	@param zip_file_path{ Path to the zip file with the firmware to upgrade
	@type zip_file_path{ str
	@param dfu_transport{ Transport backend to use to upgrade
	@type dfu_transport{ nordicsemi.dfu.dfu_transport.DfuTransport
	@param connect_delay{ Delay in seconds before each connection to the DFU target
	@type connect_delay{ int
	@return
	*/
	this.dfu_transport = dfu_transport;
	//this.connect_delay = connect_delay ?? 3;
	this.total_size = 0;
	fetch("/firmware/manifest.json")
		.then(response => {
			return response.json();
		})
		.then(manifest => {
			console.log(manifest);
			this.manifest = manifest;
			this.files = {};

			// append name to this with the contents of the file as a blob
			function get_file(name,type) {
				return fetch("/firmware/" + manifest[name][type])
					.then(response => {
						return response.blob();
					})
					.then(data => {
						this.files[name][type] = data;
						if (type == "dat_file")
							this.total_size += data.size
					});
			}

			function get_files(name) {
				return Promise.all([
					get_file(name,"bin_file"),
					get_file(name,"dat_file"),
				]);
			}

			Promise.allSettled([
				get_files("softdevice_bootloader"),
				get_files("softdevice"),
				get_files("bootloader"),
				get_files("application"),
			]);
		})
}

Dfu.prototype._dfu_send_image = function (firmware) {
	//	time.sleep(this.connect_delay);
	this.dfu_transport.open();

	start_time = Date.now();

	console.log("Sending init packet...");
	this.dfu_transport.send_init_packet(this.files[firmware].dat_file);

	console.log("Sending firmware file...");
	this.dfu_transport.send_firmware(this.files[firmware].bin_file);

	end_time = Date.now();
	console.log(`Image sent in ${end_time - start_time}`);

	this.dfu_transport.close();
}

Dfu.prototype.dfu_send_images = function () {
	/*
	Does DFU for all firmware images in the stored manifest.
	*/
	if (this.files.softdevice_bootloader) {
		console.log("Sending SoftDevice+Bootloader image...")
		this._dfu_send_image("softdevice_bootloader");
	}

	if (this.files.softdevice) {
		console.log("Sending SoftDevice image...");
		this._dfu_send_image("softdevice");
	}

	if (this.files.bootloader) {
		console.log("Sending Bootloader image...");
		this._dfu_send_image("bootloader");
	}

	if (this.files.application) {
		console.log("Sending Application image...");
		this._dfu_send_image("application");
	}
}

Dfu.prototype.dfu_get_total_size = () => this.total_size;
