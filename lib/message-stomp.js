

function MessageStomp ()
{
return function ()
{
	var my = {};
	my["servers"] = {};
	my["queues"] = {};
	my["queues"]["incomming"] = {};
	my["queues"]["outgoing"] = {};

	var that = {};

	var add_server = function (host, port)
	{
		console.log ("adding server "+host+":"+port);
	};
	that["add_server"] = add_server;

	return that;
} ();
};

module.exports.MessageStomp = MessageStomp;
