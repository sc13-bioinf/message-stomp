
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
	my["stomp"]["active"] = false;
	my["stomp"]["last_active"] = new Date ();
	my["stomp"]["messages_consumed"] = 0;

	my["listeners"] = {};
	my["started"] = false;
	my["poll_interval"] = 1000;

	my["receive"] = function (body, headers)
	{
		my["stomp"]["last_active"] = new Date ();
		
		console.log ('Receive Callback Fired!');
		console.log ('Headers: ' + my["node_modules"]["util"].inspect (headers));
		console.log ('Body: ' + body);
		
	};

	my["message"] = function (message_frame)
	{
		my["stomp"]["last_active"] = new Date ();
		
		console.log ("Message Callback Fired!");
		console.log ("Frame: "+my["node_modules"]["util"].inspect (message_frame));
	};

	my["error"] = function (error_frame)
	{
		my["stomp"]["last_active"] = new Date ();
		
		console.log ("Error Callback Fired!");
		console.log ("Frame: "+my["node_modules"]["util"].inspect (error_frame));
	};

	my["connected"] = function ()
	{
		my["stomp"]["last_active"] = new Date ();
		
		for ( var destination in  my["listeners"] )
		{
			if ( my["listeners"][destination]["subscription"] === null )
			{
			}
			else
			{
				console.warn ("Old subscription found for destination '"+destination+"'");
			}	

			my["listeners"][destination]["subscription"] = my["node_modules"]["uuid"].v1 ();		

			var subscribe_headers = {
				"id": my["listeners"][destination]["subscription"],
				"destination": destination,
				"ack": "client"
			};
			console.log ("subscribe headers are: "+subscribe_headers);
			my["stomp"]["connection"].subscribe (subscribe_headers, my["receive"]);
		}
	};
		
	my["poll"] = function ()
	{
		var current_time = new Date ();
		var elapsed_time = current_time.getTime () - my["stomp"]["last_active"].getTime ();	
		if ( elapsed_time > 20000 || my["stomp"]["active"] === false )
		{
			if ( my["stomp"]["active"] )
			{
				my["stomp"]["connection"]. disconnect ();
			}
			my["stomp"]["connection"].connect ();
			my["stomp"]["active"] = true;
		}
		setTimeout (my["poll"], my["poll_interval"]);
	};

	my["start"] = function ()
	{
		if ( my["started"] )
		{
		}
		else
		{
			my["stomp"]["connection"].on ("connected", my["connected"]);
			my["stomp"]["connection"].on ("message", my["message"]);
			my["stomp"]["connection"].on ("error", my["error"]);
			setTimeout (my["poll"], my["poll_interval"]);	
			my["started"] = true;
		}
	};

	var that = {};
	var add_listener = function (destination, listener)
	{
		var result = false;
		if ( typeof destination === "string" && typeof listener === "function" )
		{ 
			my["listeners"][destination] = {
				"listener": listener,
				"subscription": null
			};
			result = true;
		}
		return result;
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
