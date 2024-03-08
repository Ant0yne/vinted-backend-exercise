const express = require("express");
const fileUpload = require("express-fileupload");
const User = require("../models/User");
const Offer = require("../models/Offer");
// return the uploaded file with the middleware in req.fileUploaded
// const uploadAutoCloudinary = require("../middlewares/uploadAutoCloudinary");
// return the document (from MDB) of the user in req.user
const isAuthenticated = require("../middlewares/isAuthenticated");
const cloudinaryFunc = require("../functions/cloudinaryFunc");

const router = express.Router();

const maxPriceOfferGlobal = 100000;

/**
 * Create an offer
 */
router.post(
	"/offer/publish",
	isAuthenticated,
	fileUpload(),
	// req.fileUploaded -> the object with the file info from Cloudinary
	cloudinaryFunc.middlewareCreate,
	async (req, res) => {
		try {
			const detailsBody = [
				{ MARQUE: req.body.brand },
				{ TAILLE: req.body.size },
				{ ÉTAT: req.body.condition },
				{ COULEUR: req.body.color },
				{ EMPLACEMENT: req.body.city },
			];
			// console.log("Etape 5 : ", req.fileUploaded);
			const newOffer = new Offer({
				product_name: req.body.title,
				product_description: req.body.description,
				product_price: req.body.price,
				product_details: detailsBody,
				product_image: req.fileUploaded,
				owner: req.user,
				// owner: req.user,
			});

			await newOffer.save();

			await newOffer.populate("owner", "account");

			// cloudinaryFunc.folder(newOffer._id);

			return res.status(200).json(newOffer);
		} catch (error) {
			return res.status(500).json({ message: error.message });
		}
	}
);

/**
 *  Return an array with the offers (according to the query) from the DB
 */
router.get("/offers", async (req, res) => {
	try {
		let { title, description, priceMin, priceMax, sort, page } = req.query;
		const limitPerPage = 5;
		let sortFinalValue = "desc";
		const skipFinalValue = (page - 1) * limitPerPage;

		if (!priceMin) {
			priceMin = 0;
		}
		if (!priceMax) {
			priceMax = maxPriceOfferGlobal;
		}
		if (!page) {
			page = 1;
		}
		if (sort) {
			sortFinalValue = sort.replace("price-", "");
		}

		const offerList = await Offer.find({
			product_name: new RegExp(title, "i"),
			product_description: new RegExp(description, "i"),
			product_price: { $gte: priceMin, $lte: priceMax },
		})
			.populate("owner", "account")
			.sort({ product_price: sortFinalValue })
			.skip(skipFinalValue)
			.limit(limitPerPage);
		// .select("product_name product_description product_price owner -_id");

		const returnOfferList = { count: offerList.length, offers: offerList };

		console.log(`Le find renvoie ${offerList.length} offres`);
		return res.status(200).json(returnOfferList);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

/**
 *  Return the offers (according to the id in params) from the DB
 */
router.get("/offers/:id", async (req, res) => {
	try {
		const offerByID = await Offer.findById(req.params.id)
			.populate("owner", "account -_id")
			.select("product_name product_description product_price owner -_id");

		if (!offerByID) {
			return res
				.status(400)
				.json({ message: "No offer can be found with this Id." });
		}
		return res.status(200).json(offerByID);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

/**
 * Modify an existing offer
 */
router.put("/offer/:id", isAuthenticated, fileUpload(), async (req, res) => {
	try {
		const isBodyPopulate = (obj) => {
			for (const prop in obj) {
				if (Object.hasOwn(obj, prop)) {
					return true;
				}
			}
			return false;
		};

		if (isBodyPopulate(req.body) === false) {
			return res.status(400).json({
				message:
					"Please change at least one information from your offer before validate.",
			});
		}

		const offerID = req.params.id;
		const offerToModify = await Offer.findOne({ _id: offerID }).populate(
			"owner"
		);

		if (!offerToModify) {
			return res.status(404).json({ message: "This offer doesn't exist." });
		} else if (offerToModify.owner.token !== req.user.token) {
			return res.status(401).json({ error: "Unauthorized to do this action." });
		} else {
			if (req.body.title) {
				offerToModify.product_name = req.body.title;
			}
			if (req.body.description) {
				offerToModify.product_description = req.body.description;
			}
			if (Number(req.body.price)) {
				offerToModify.product_price = req.body.price;
			}
			if (req.body.brand) {
				offerToModify.product_details[0] = { MARQUE: req.body.brand };
			}
			if (req.body.size) {
				offerToModify.product_details[1] = { TAILLE: req.body.size };
			}
			if (req.body.condition) {
				offerToModify.product_details[2] = { ÉTAT: req.body.condition };
			}
			if (req.body.color) {
				offerToModify.product_details[3] = { COULEUR: req.body.color };
			}
			if (req.body.city) {
				offerToModify.product_details[4] = { EMPLACEMENT: req.body.city };
			}
			if (req.files) {
				const newFile = await cloudinaryFunc.deleteCreate(
					req.files.picture,
					offerToModify.product_image.public_id
				);
				// console.log("Etape 4 : ", newFile);
				offerToModify.product_image = newFile;
			}

			await offerToModify.save();

			return res.status(200).json(offerToModify);
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

router.delete("/offer/:id", isAuthenticated, async (req, res) => {
	try {
		const offerID = req.params.id;
		const offerToDelete = await Offer.findOne({ _id: offerID }).populate(
			"owner"
		);

		if (!offerToDelete) {
			return res.status(404).json({ message: "This offer doesn't exist." });
		} else if (offerToDelete.owner.token !== req.user.token) {
			return res.status(401).json({ error: "Unauthorized to do this action." });
		} else {
			await offerToDelete.deleteOne();

			return res.status(200).json({
				message: `Your offer ${offerToDelete.product_name} was successfully deleted.`,
			});
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});
module.exports = router;
