
var ConnectionManager = function (opts)
{
	return function ()
{
	var my = {};
	my["node_modules"] = {};
	my["node_modules"]["uuid"] = require ("uuid");
	my["node_modules"]["stomp"] = require ("stomp");
	my["node_modules"]["util"] = require ("util");

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
		
		if ( message_frame.hasOwnProperty ("headers") )
		{
			if ( message_frame["headers"].hasOwnProperty ("message-id") )
			{
				my["stomp"]["connection"].ack (message_frame["headers"]["message-id"]);
			}
			if ( message_frame["headers"].hasOwnProperty ("subscription") && message_frame["headers"].hasOwnProperty ("destination") )
			{
				if ( my["listeners"].hasOwnProperty (message_frame["headers"]["destination"]) )
				{
					if ( my["listeners"][message_frame["headers"]["destination"]].hasOwnProperty ("subscription") )
					{
						if ( my["listeners"][message_frame["headers"]["destination"]]["subscription"] === message_frame["headers"]["subscription"] )
						{
							try
							{
								var data = JSON.parse (message_frame["body"]);
								my["listeners"][message_frame["headers"]["destination"]]["listener"] (data);
							}
							catch (err)
							{
								console.log ("Error parsing message");
							}
						}
					}
				}
			}
		}
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
			console.log ("subscribe headers are: "+my["node_modules"]["util"].inspect (subscribe_headers));
			my["stomp"]["connection"].subscribe (subscribe_headers, my["receive"]);
		}
	};
	
	my["unsubscribe_all"] = function ()
	{
		for ( var destination in  my["listeners"] )
		{
			if ( my["listeners"][destination]["subscription"] === null )
			{
			}
			else
			{
				console.log ("unsubscribe from: '"+destination+"'");
				// stomp client module wants the destination for book keeping
				var unsubscribe_headers = {
					"destination": destination,
					"id": my["listeners"][destination]["subscription"]
				};
				my["stomp"]["connection"].unsubscribe (unsubscribe_headers);
				my["listeners"][destination]["subscription"] = null;
			}
		}
	};
	
	my["poll"] = function ()
	{
		if ( my["started"] )
		{
			var current_time = new Date ();
			var elapsed_time = current_time.getTime () - my["stomp"]["last_active"].getTime ();	
			if ( elapsed_time > 20000 || my["stomp"]["active"] === false )
			{
				console.log ("Elapsed time: "+(elapsed_time/1000));
				console.log ("Reconnect? "+my["stomp"]["active"]);
				if ( my["stomp"]["active"] )
				{
					my["unsubscribe_all"] ();
					my["stomp"]["connection"]. disconnect ();
					my["stomp"]["active"] = false;
				}
				my["stomp"]["connection"].connect ();
				my["stomp"]["active"] = true;
			}
			setTimeout (my["poll"], my["poll_interval"]);
		}
		else if ( my["stomp"]["active"] )
		{
			my["stomp"]["connection"]. disconnect ();
			my["stomp"]["active"] = false;
		}
	};
	
	var that = {};

	var start = function ()
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
	that["start"] = start;

	var stop = function ()
	{
		my["started"] = false;
	};
	that["stop"] = stop;

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
};

function MessageStomp ()
{
return function ()
{
	var my = {};

	my["node_modules"] = {};
	my["node_modules"]["util"] = require ("util");

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
			if ( my["servers"][server_id].hasOwnProperty ("connection_manager") )
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
	that["add_listener"] = add_listener;

	var start = function ()
	{
		for (var server_id in my["servers"] )
		{
			my["servers"][server_id]["connection_manager"].start ();
		}
	};
	that["start"] = start;

	var stop = function ()
	{
		for (var server_id in my["servers"] )
		{
			my["servers"][server_id]["connection_manager"].stop ();
		}
	};
	that["stop"] = stop;
	return that;
} ();
};

module.exports.MessageStomp = MessageStomp;
