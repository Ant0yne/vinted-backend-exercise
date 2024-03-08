const isObjectPopulate = (obj) => {
	for (const prop in obj) {
		if (Object.hasOwn(obj, prop)) {
			return true;
		}
	}
	return false;
};

module.exports = isObjectPopulate;
