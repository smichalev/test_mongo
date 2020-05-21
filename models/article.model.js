const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleScheme = new Schema({
	title: String,
	content: String,
	creater: mongoose.Types.ObjectId,
	created: {
		type: Date,
		default: Date.now,
	},
});

const Article = mongoose.model("Article", articleScheme);

module.exports = Article;