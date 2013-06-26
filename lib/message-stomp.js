
function ConnectionManager (opts)
{
	var my = {};
	my["node_modules"] = {};
	my["node_modules"]["uuid"] = require ("uuid");
	my["node_modules"]["stomp"] = require ("stomp");

	my["stomp"] = {};
	my["stomp"]["host"] = opts["host"];
	my["stomp"]["port"] = opts["port"];
	my["stomp"]["connection"] = new my["node_modules"]["stomp"].Stomp ({"host": my["stomp"]["host"], "port": my["stomp"]["port"]});
	my["stomp"]["messages_consumed"] = 0;

	my["listeners"] = {};
	my["started"] = false;
	my["poll_interval"] = 1000;

	my["open"] = function ()
	{
		my["stomp"]["connection"].connect ();
	};
	my["close"] = function ()
	{
		my["stomp"]["connection"]. disconnect ();
	};

	my["poll"] = function ()
	{
			
		setTimeout (my["poll"], my["poll_interval"]);
	};

	my["start"] = function ()
	{
		if ( my["started"] )
		{
		}
		else
		{
			setTimeout (my["poll"], my["poll_interval"]);	
			my["started"] = true;
		}
	};

	var that = {};
	var add_listener = function (destination, listener)
	{
		my["listeners"][destination] = {
			"listener": listener,
			"subscription": null
		};
	};
	that["add_listener"] = add_listener;
	return that; 
} ();

function MessageStomp ()
{
return function ()
{
	var my = {};
	my["server_id"] = 0;
	my["servers"] = {};
	my["queues"] = {};
	my["queues"]["incomming"] = {};
	my["queues"]["outgoing"] = {};

	var that = {};

	var add_server = function (host, port)
	{
		console.log ("adding server "+host+":"+port);
		my["servers"][my["server_id"]++] = {
			"host": host,
			"port": port
		};
		return (my["server_id"] - 1).toString ();
	};
	that["add_server"] = add_server;

	var add_listener = function (destination, listener)
	{
		var result = true;
		var server_id = "0";
		if ( arguments.length === 3 )
		{
			server_id = arguments[2];
		}
		if ( my["servers"].hasOwnProperty (server_id) )
		{
			if ( my["servers"][server_id}.hasOwnProperty ("connection_manager") )
			{
				result = my["servers"][server_id]["connection_manager"].add_listener (destination, listener);
			}
			else
			{
				var connection = {
					"host": my["servers"][server_id]["host"],
					"port": my["servers"][server_id]["port"]
				};
				my["servers"][server_id]["connection_manager"] = ConnectionManager (connection);
				result = my["servers"][server_id]["connection_manager"].add_listener (destination, listener);
			}	
		}
		else
		{
			result = false;
		}
		return result;
	};

	return that;
} ();
};

module.exports.MessageStomp = MessageStomp;
