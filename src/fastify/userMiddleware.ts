const fastify = require('fastify')();

// Middleware function
const singleUserMiddleware = async (req, res, next) => {
	const userService = req.fastify.userService;
	const user = await userService.getUser(userService.getSingleUserId());
	req.user = user;
	next();
};
