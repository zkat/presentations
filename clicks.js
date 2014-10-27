can.$(function() {
	can.$(document.body).append(can.view("#main")({
		latestClicks: Bacon.Browser.Mouse.clicks()
			.slidingWindow(5)
			.toCanList(),
		currentPosition: Bacon.Browser.Mouse.position()
			.startWith({x:0,y:0})
			.toCanMap()
	}));
});
