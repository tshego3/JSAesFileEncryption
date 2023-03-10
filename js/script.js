! function()
{
	const n = CryptoJS,
		t = n.lib.WordArray;
	n.enc.Uint8Arr = {
		decode: function(n)
		{
			const t = n.words,
				r = n.sigBytes,
				o = [];
			for (let n = 0; n < r; n++)
			{
				const r = t[n >>> 2] >>> 24 - n % 4 * 8 & 255;
				o.push(r)
			}
			return new Uint8Array(o)
		},
		parse: function(n)
		{
			const r = [],
				o = n.length;
			for (let t = 0; t < o; t++) r[2 * t >>> 3] |= n[t] << 24 - 2 * t % 8 * 4;
			return new t.init(r, o)
		}
	}
}();

var aesCrypt;
! function()
{
	let e = {
			bufferSize: 32768,
			fileFormatVersion: 2,
			maxPassLen: 1024,
			AESBlockSize: 16
		},
		t = {};
	const a = {
		urandom: e => crypto.getRandomValues(new Uint8Array(e)),
		arrToInt: e => parseInt(Array.prototype.map.call(e, e => ("00" + e.toString(16)).slice(-2)).join(""), 16),
		bytes2str: e => CryptoJS.enc.Latin1.stringify(CryptoJS.enc.Uint8Arr.parse(e))
	};
	async function r(e, a)
	{
		let r = CryptoJS.enc.Uint8Arr.decode(CryptoJS.enc.Utf16LE.parse(e)),
			n = new t.BinaryStream;
		n.appendBytes(a), n.appendBytes("\0".repeat(16)), n = n.finalize();
		for (let e = 0; e < 8192; e++)
		{
			let e = new t.BinaryStream(n);
			e.appendBytes(r), n = await t.webCryptSubtle.webHashSHA256(e.finalize())
		}
		return n
	}
	async function n(t)
	{
		let r;
		await async function(t)
		{
			if ("AES" !== a.bytes2str(await t.readBytes(3))) throw "File is corrupted or not an AES Crypt \n(or jsAesCrypt) file.";
			if (await t.readByte() !== e.fileFormatVersion) throw "jsAesCrypt is only compatible with version \n2 of the AES Crypt file format."
		}(t), await t.readByte();
		do {
			(r = +a.arrToInt(await t.readBytes(2))) > 0 && await t.readBytes(r)
		} while (r > 0)
	}
	t = aesCrypt = {
		encrypt: async function(n, i)
		{
			if (i.length > e.maxPassLen) throw "Password is too long.";
			const s = a.urandom(e.AESBlockSize),
				y = await r(i, s),
				o = a.urandom(e.AESBlockSize),
				p = a.urandom(32);
			let l = new t.BinaryStream;
			l.appendBytes(o), l.appendBytes(p), l = await t.webCryptSubtle.webEncryptAes(l.finalize(), y, s);
			const w = await t.webCryptSubtle.webHashHMAC(l, y);
			return await async function(a, r, n, i, s, y)
			{
				let o = new t.BinaryStream;
				o.appendBytes("AES"), o.appendBytes(e.fileFormatVersion), o.appendBytes(0);
				const p = "";
				o.appendBytes(0), o.appendBytes(1 + ("" + p).length), o.appendBytes(""), o.appendBytes(0), o.appendBytes(p), o.appendBytes([0, 128]), o.appendBytes("\0".repeat(128)), o.appendBytes([0, 0]), o.appendBytes(r), o.appendBytes(n), o.appendBytes(s);
				let l = new t.FileBytesReader(a),
					w = l.getLength(),
					c = new t.BinaryStream(await l.readBytes(l.getLength())),
					u = String.fromCharCode(w % e.AESBlockSize),
					f = await t.webCryptSubtle.webEncryptAes(c.finalize(), i, y),
					d = await t.webCryptSubtle.webHashHMAC(f, i);
				return o.appendBytes(f), o.appendBytes(u), o.appendBytes(d), await o.finalize()
			}(n, s, l, p, w, o)
		},
		decrypt: async function(i, s)
		{
			let y = new t.FileBytesReader(i);
			await n(y);
			let o = await async function(e, n)
				{
					let i = await e.readBytes(16),
						s = await r(n, i),
						y = await e.readBytes(48),
						o = a.bytes2str(await e.readBytes(32)),
						p = await t.webCryptSubtle.webHashHMAC(y, s);
					if (o !== a.bytes2str(p)) throw "Wrong password (or file is corrupted).";
					return await t.webCryptSubtle.webDecryptAes(y, s, i, 0)
				}(y, s),
				p = o.slice(0, e.AESBlockSize),
				l = o.slice(e.AESBlockSize, e.AESBlockSize + 32),
				w = new t.BinaryStream(await y.readBytes(y.getLength() - y.getCurrentPosition() - 32 - 1)),
				c = a.arrToInt(await y.readBytes(1)),
				u = await t.webCryptSubtle.webHashHMAC(w.finalize(), l);
			if (a.bytes2str(await y.readBytes(32)) !== a.bytes2str(u)) throw "Bad HMAC (file is corrupted).";
			try
			{
				return await t.webCryptSubtle.webDecryptAes(w.finalize(), l, p, c)
			}
			catch
			{
				let a = await t.webCryptSubtle.webDecryptAes(w.finalize(), l, p, 0),
					r = e.AESBlockSize - c;
				return a.slice(0, a.length - r)
			}
		},
		utils: a,
		info: e
	}, "undefined" != typeof window && (window.aesCrypt = t)
}(), aesCrypt.FileBytesReader = function(e)
	{
		let t = 0,
			a = e.size,
			r = new FileReader,
			n = e;
		async function i(e)
		{
			if (a - t < e) throw "File is corrupted.";
			return await
			function(e)
			{
				return new Promise((a, i) =>
				{
					let s = n.slice(t, t += e);
					r.onload = (() =>
					{
						a(new Uint8Array(r.result))
					}), r.onerror = i, r.readAsArrayBuffer(s)
				})
			}(e)
		}
		return {
			readByte: async function()
			{
				return (await i(1))[0]
			},
			readBytes: i,
			getCurrentPosition: function()
			{
				return t
			},
			getLength: function()
			{
				return a
			}
		}
	}, aesCrypt.BinaryStream = function(e = [])
	{
		let t = new Uint8Array(e);
		return {
			appendBytes: function(e)
			{
				let a = [];
				if ("number" == typeof e) a = e.toString(16).match(/.{1,2}/g).map(e => parseInt(e, 16));
				else if ("string" == typeof e)
					for (let t = 0; t < e.length; t++) a.push(e.charCodeAt(t));
				else a = e;
				a = new Uint8Array(a);
				let r = new Uint8Array(t.length + a.length);
				r.set(t), r.set(a, t.length), t = r
			},
			finalize: function()
			{
				return t
			},
			getLength: function()
			{
				return t.length
			}
		}
	},
	function()
	{
		let e = aesCrypt;
		aesCrypt.webCryptSubtle = {
			createKey: async(e, t, a) => await crypto.subtle.importKey("raw", e.buffer, t, !1, a),
			async webHashHMAC(e, t)
			{
				let a = await this.createKey(t,
				{
					name: "HMAC",
					hash:
					{
						name: "SHA-256"
					}
				}, ["sign", "verify"]);
				return new Uint8Array(await crypto.subtle.sign("HMAC", a, e))
			},
			async webEncryptAes(t, a, r, n = !0)
			{
				let i = await this.createKey(a, "AES-CBC", ["encrypt", "decrypt"]),
					s = new Uint8Array(await crypto.subtle.encrypt(
					{
						name: "AES-CBC",
						iv: r
					}, i, t));
				return t.length % e.info.AESBlockSize == 0 && !0 === n && (s = s.slice(0, s.length - e.info.AESBlockSize)), s
			},
			webHashSHA256: async e => new Uint8Array(await crypto.subtle.digest("SHA-256", e.buffer)),
			async webDecryptAes(t, a, r, n = 0)
			{
				let i = await this.createKey(a, "AES-CBC", ["encrypt", "decrypt"]),
					s = new e.BinaryStream(t);
				if (0 === n)
				{
					let n = [];
					for (let a = 0; a < e.info.AESBlockSize; a++) n.push(0 ^ t[t.length - e.info.AESBlockSize + a]);
					s.appendBytes(await this.webEncryptAes(new Uint8Array(n), a, r, !1))
				}
				let y = new Uint8Array(await crypto.subtle.decrypt(
				{
					name: "AES-CBC",
					iv: r
				}, i, s.finalize()));
				return 0 === n && (y = y.slice(0, y.length - e.info.AESBlockSize)), y
			}
		}
	}();

// Init aesCrypt library
const aes = aesCrypt;

function convertToBase64(paramString) {
    var words = CryptoJS.enc.Utf8.parse(paramString);
    var base64 = CryptoJS.enc.Base64.stringify(words);
    return base64;
}

function downloadBase64File(filename, base64string) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = "data:application/octet-stream;base64," + base64string;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

const fileEncrypt = document.getElementById("fileEncrypt");
fileEncrypt.addEventListener("change", () => {
    try {
        var inputFile = fileEncrypt.files[0];
        var inputKey = document.getElementById("inputKey").value;

        if (inputKey == "") {
            alert("The key is null or empty!");
            document.getElementById("inputKey").focus();
        }
        else {
            // encrypt typed array (Uint8Array)
            aes.encrypt(inputFile, inputKey).then((encrypted) => {
                // transform Uint8Array to Base64 string and downloads the file
                downloadBase64File(inputFile.name + ".aes", CryptoJS.enc.Base64.stringify(CryptoJS.enc.Uint8Arr.parse(encrypted)));
            });
        }
    }
    catch (error) {
        console.error(error);
    }
},
false
);

const fileDecrypt = document.getElementById("fileDecrypt");
fileDecrypt.addEventListener("change", () => {
    try {
        let inputFile = fileDecrypt.files[0];
        let inputKey = document.getElementById("inputKey").value;

        if (inputKey == "") {
            alert("The key is null or empty!");
            document.getElementById("inputKey").focus();
        }
        else {
            // decrypt typed array (Uint8Array)
            aes.decrypt(inputFile, inputKey).then((decrypted) => {
                // transform Uint8Array to Base64 string and downloads the file
                downloadBase64File(inputFile.name.replace(".aes", ""), CryptoJS.enc.Base64.stringify(CryptoJS.enc.Uint8Arr.parse(decrypted)));
            });
        }
    }
    catch (error) {
        console.error(error);
    }
},
false
);
