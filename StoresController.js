exports.moduleInit = function() {
	this.main = module.parent;
	this.io = this.main.exports.getSocketIo();
	this.underscore = this.main.exports.getUnderscore();
};

exports.onStoreUpdate = function() {
	console.log('I received a store update from ', from, ' with ', msg);
};
