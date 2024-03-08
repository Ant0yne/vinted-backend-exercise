const cloudinary = require("cloudinary").v2;
const isObjectPopulate = require("../functions/isObjectPopulate");

cloudinary.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.API_KEY,
	api_secret: process.env.API_SECRET,
});

const convertToBase64 = (file) => {
	return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

/**
 *
 * @param {object} fileToUpload
 * @param {string} fileToDelete
 * @returns object with the data from Cloudinary regarding the file
 */
const deleteCreate = async (fileToUpload, fileToDelete) => {
	try {
		if (fileToDelete) {
			await cloudinary.uploader.destroy(fileToDelete);
		}
		// console.log("Etape 2 : ", fileToUpload);
		const result = await cloudinary.uploader.upload(
			convertToBase64(fileToUpload)
		);
		// console.log("Etape 3 : ", result);
		return result;
	} catch (error) {
		return res.status(500).json({ message: "Error during the file upload." });
	}
};

const middlewareCreate = async (req, res, next) => {
	try {
		if (req.files) {
			// console.log("étape 1 : ", req.files.picture);
			req.fileUploaded = await deleteCreate(req.files.picture, null);
			// console.log("Etape 4", req.fileUploaded);
			return next();
		} else {
			return res
				.status(400)
				.json({ message: "Please upload a picture of your item." });
		}
	} catch (error) {
		return res.status(500).json({ message: "Error during the file upload." });
	}
};

const folder = async (offerID, filePublicId) => {
	try {
		const folderList = await cloudinary.api.sub_folders("vinted/offers");
		let newPublicId = "";

		if (folderList.folders.length <= 0) {
			const folderCreated = await cloudinary.api.create_folder(
				"vinted/offers/" + offerID
			);
			newPublicId = folderCreated.path + "/" + filePublicId;
		} else {
			newPublicId = folderList.folders.path + "/" + filePublicId;
		}

		const result = await cloudinary.uploader.rename(filePublicId, newPublicId);

		return result;
	} catch (error) {
		console.error(error.message);
	}
};

module.exports = { deleteCreate, middlewareCreate, folder };
