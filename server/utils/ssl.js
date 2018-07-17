//const path = require('path')
//const fs = require('fs')
const selfsigned = require('selfsigned')

//const { app } = require('electron')

module.exports = {
	generate: () => {

//		const certPath = path.join(app.getPath('appData'), "../ssl/server.pem");
//		let certExists = fs.existsSync(certPath);

//		if (certExists) {
//			fs.unlinkSync(certPath)
//		}

		const attrs = [{ name: "commonName", value: "localhost" }];
		const pems = selfsigned.generate(attrs, {
			algorithm: "sha256",
			days: 365,
			keySize: 2048
		});

		return pems.private + pems.cert

//		fs.writeFileSync(certPath, pems.private + pems.cert, { encoding: "utf-8" });

//		const fakeCert = fs.readFileSync(certPath);

//		return fakeCert

	}
}