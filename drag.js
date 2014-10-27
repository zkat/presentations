can.$(function() {
	can.Component.extend({
		tag: "drag-demo",
		template: can.view("#drag-demo-tpl"),
		scope: {
			clamp: true,
			step: 1, // exercise for the reader
			boxPosition: {x: 0, y: 0}
		},
		events: {
			inserted: function() {
				var scope = this.scope,
					el = this.element,
					control = this,
					box = el.children(".draggable-box"),
					// this.on() makes listening to observables memory-safe.
					boxHeld = this.on(Bacon.Browser.Mouse.isHeld(box)).log("box being held");
				boxHeld.assign(can.$("body"), "toggleClass", "drag-demo-dragging");
				boxHeld.filter(boxHeld).onValue(function() {
					control.boxPosition(box)
						.takeWhile(boxHeld)
						.log("box being dragged")
						.assign(scope, "attr", "boxPosition");
				});
			},
			boxPosition: function(box) {
				var startPos = box.position(),
					that = this;
				return that.on(Bacon.Browser.Mouse.deltas())
					.scan({x: startPos.left, y: startPos.top}, function(a, b) {
						return {x: a.x + b.x, y: a.y + b.y};
					}).map(function(coords) {
						return that.scope.attr("clamp") ?
							that.clampToDemo(box, coords) :
							coords;
					});
			},
			clampToDemo: function(box, coordinates) {
				var el = this.element;
				return {
					x: Math.floor(clamp(coordinates.x, 0, el.width()-box.width())),
					y: Math.floor(clamp(coordinates.y, 0, el.height()-box.height()))
				};
			}
		}
	});

	function clamp(num, min, max) {
		return Math.max(min, Math.min(num, max));
	}

	can.$(document.body).append(can.view("#main")());
});
