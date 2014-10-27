can.$(function() {
	window.fakeSocket = {
		simulateMessage: function(data) {
			this.onmessage(data);
		}
	};
	
	var viewModel = new can.Map({}),
		bus = new Bacon.Bus();

	fakeSocket.onmessage = function(msg) {
		bus.push(msg);
	};
	
	var changeEvents = bus.flatMap(function(msg) {
		switch(msg.type) {
		case "user":
			return {
				how: "replace",
				value: msg.data,
				removeOthers: true
			};
		case "update":
		case "newProperty":
		case "remProp":
			return {
				how: msg.type === "update" ?
					"set" :
					(msg.type === "newProperty" ?
					 "add" :
					 "remove"),
				which: msg.data.key,
				value: msg.data.val
			};
		default:
			return new Bacon.Error("Unexpected message type: "+msg.type);
		}
	});

	viewModel.attr("user", changeEvents.toCanMap());
	viewModel.attr("changeLog", changeEvents.map(JSON.stringify).slidingWindow(10).toCanList());
	
	can.$(document.body).append(can.view("#main")(viewModel));
	
	window.messages = [{
		type: "user",
		data: {
			name: "Kat",
			phone: "867-5309"
		}
	}, {
		type: "newProperty",
		data: {
			key: "address",
			val: "MKE"
		}
	}, {
		type: "update",
		data: {
			key: "name",
			val: "Eli"
		}
	}, {
		type: "remProp",
		data: {
			key: "phone"
		}
	}];
	window.demo = function() {
		var msg = window.messages.shift();
		if (msg) {
			window.fakeSocket.simulateMessage(msg);
			setTimeout(window.demo, 2000);
		}
	};
	window.viewModel = viewModel;
	window.demo();
});
