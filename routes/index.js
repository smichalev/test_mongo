const path = require('path');
const ErrorList = require(path.join(__dirname, '..', 'errors', 'error.list'));
const md5 = require('md5');
const config = require(path.join(__dirname, '..', 'config'));
const timezone = require('moment-timezone');

const {User, Article} = require(path.join(__dirname, '..', 'models'));

module.exports = (app) => {
	app.get('/', async (req, res, next) => {
		try {
			let page = 1;
			
			if (req.query.page) {
				if (!/^\d+$/.test(req.query.page) || req.query.page < 0) {
					throw new ErrorList(ErrorList.CODES.NOT_CORRECT_QUERY);
				}
				
				page = +req.query.page;
			}
			
			let query = Article.find({}).skip((page - 1) * config.elementOnPage).limit(config.elementOnPage);
			
			let articles = await query;
			
			if (req.query.page && !articles.length) {
				throw new ErrorList(ErrorList.CODES.PAGE_NOT_FOUND);
			}
			
			let count = await Article.countDocuments({});
			let pages = Math.ceil(count / config.elementOnPage);
			
			let arrPage = [];
			
			for (let i = 1; i <= pages; i++) {
				arrPage.push(i);
			}
			
			let login = !req.session.user ? false : req.session.user;
			
			for (let i = 0; i < articles.length; i++) {
				articles[i].date = timezone(new Date(articles[i].created)).format('L');
			}
			
			res.render('index', {login, articles, arrPage, page});
		}
		catch (err) {
			next(err);
		}
	});
	
	app.get('/login', (req, res, next) => {
		if (req.session.user) {
			return res.redirect('/');
		}
		
		res.render('login');
	});
	
	app.post('/login', async (req, res, next) => {
		try {
			if (!req.body.login || !req.body.password) {
				throw new ErrorList(ErrorList.CODES.NOT_CORRECT_QUERY);
			}
			
			let user = await User.findOne({login: req.body.login, password: md5(req.body.password)});
			
			if (!user) {
				throw new ErrorList(ErrorList.CODES.BAD_PASSWORD_OR_LOGIN);
			}
			
			req.session.user = user;
			req.session.save();
			
			res.redirect('/');
		}
		catch (err) {
			next(err);
		}
	});
	
	app.get('/registration', (req, res, next) => {
		if (req.session.user) {
			return res.redirect('/');
		}
		
		res.render('registration');
	});
	
	app.post('/registration', async (req, res, next) => {
		try {
			if (!req.body.login || !req.body.password) {
				throw new ErrorList(ErrorList.CODES.NOT_CORRECT_QUERY);
			}
			
			let user = await User.findOne({login: req.body.login});
			
			if (user) {
				throw new ErrorList(ErrorList.CODES.USER_IS_ALREADY_THERE);
			}
			
			const profile = new User({login: req.body.login, password: md5(req.body.password)});
			
			await profile.save();
			
			req.session.user = profile;
			req.session.save();
			
			res.redirect('/');
			
		}
		catch (err) {
			next(err);
		}
	});
	
	app.post('/logout', (req, res, next) => {
		try {
			req.session.destroy();
			res.redirect('/');
		}
		catch (err) {
			next(err);
		}
	});
	
	app.get('/newarticle', (req, res, next) => {
		if (!req.session.user) {
			return res.redirect('/');
		}
		
		res.render('newarticle');
	});
	
	app.post('/newarticle', async (req, res, next) => {
		if (!req.session.user) {
			return res.redirect('/');
		}
		
		try {
			if (!req.body.title || !req.body.content) {
				throw new ErrorList(ErrorList.CODES.NOT_CORRECT_QUERY);
			}
			
			const article = new Article({title: req.body.title, content: req.body.content, creater: req.session.user._id});
			
			await article.save();
			
			res.redirect('/' + article.id);
		}
		catch (err) {
			next(err);
		}
	});
	
	app.get('/:id', async (req, res, next) => {
		try {
			if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
				throw new ErrorList(ErrorList.CODES.NOT_CORRECT_QUERY);
			}
			
			let article = await Article.findOne({_id: req.params.id});
			
			if (!article) {
				throw new ErrorList(ErrorList.CODES.NOT_FOUND);
			}
			
			article.Creater = await User.findOne({_id: article.creater});
			article.date = timezone(new Date(article.created)).format('L');
			
			let myarticle = false;
			
			if (req.session.user) {
				if (req.session.user._id === String(article.creater)) {
					myarticle = true;
				}
			}
			
			res.render('article', {article, myarticle});
		}
		catch (err) {
			next(err);
		}
	});
	
	app.get('/edit/:id', async (req, res, next) => {
		try {
			if (!req.session.user) {
				throw new ErrorList(ErrorList.CODES.NO_RIGHTS_TO_ACT);
			}
			
			let article = await Article.findOne({_id: req.params.id});
			
			if (!article) {
				throw new ErrorList(ErrorList.CODES.NOT_FOUND);
			}
			
			if (req.session.user._id !== String(article.creater)) {
				throw new ErrorList(ErrorList.CODES.NO_RIGHTS_TO_ACT);
			}
			
			res.render('editarticle', {article});
		}
		catch (err) {
			next(err);
		}
	});
	
	app.post('/edit/:id', async (req, res, next) => {
		try {
			if (!req.session.user) {
				throw new ErrorList(ErrorList.CODES.NO_RIGHTS_TO_ACT);
			}
			
			if (!req.body.title || !req.body.content) {
				throw new ErrorList(ErrorList.CODES.NOT_CORRECT_QUERY);
			}
			
			let article = await Article.findOne({_id: req.params.id});
			
			if (!article) {
				throw new ErrorList(ErrorList.CODES.NOT_FOUND);
			}
			
			if (req.session.user._id !== String(article.creater)) {
				throw new ErrorList(ErrorList.CODES.NO_RIGHTS_TO_ACT);
			}
			
			article.title = req.body.title;
			article.content = req.body.content;
			
			await article.save();
			
			res.redirect('/' + article._id);
		}
		catch (err) {
			next(err);
		}
	});
	
	app.post('/:id', async (req, res, next) => {
		try {
			if (!req.session.user) {
				throw new ErrorList(ErrorList.CODES.NO_RIGHTS_TO_ACT);
			}
			
			let article = await Article.findOne({_id: req.params.id});
			
			if (!article) {
				throw new ErrorList(ErrorList.CODES.NOT_FOUND);
			}
			
			if (req.session.user._id !== String(article.creater)) {
				throw new ErrorList(ErrorList.CODES.NO_RIGHTS_TO_ACT);
			}
			
			await article.remove();
			
			res.redirect('/');
		}
		catch (err) {
			next(err);
		}
	});
	
	app.use((err, req, res, next) => {
		if (!err) {
			return next();
		}
		
		let response = {};
		
		if (err.code !== null && err.code !== 'undefined') {
			response.code = err.code;
		}
		
		let message = err.message || 'Unknown error';
		
		response.message = message;
		
		return res.render('error', {error: response, path: req.headers.referer});
	});
	
	app.use((req, res) => {
		let error = new ErrorList(ErrorList.CODES.NOT_FOUND);
		
		return res.render('error', {error, path: '/'});
	});
};