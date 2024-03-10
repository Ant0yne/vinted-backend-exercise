const mongoose = require("mongoose");

const Offer = mongoose.model("Offer", {
	product_name: { type: String, required: true },
	product_description: { type: String, required: true },
	product_price: { type: Number, required: true },
	product_details: Array,
	product_image: { type: Object, required: true },
	owner: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
});

module.exports = Offer;
