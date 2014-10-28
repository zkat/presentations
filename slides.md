title: can.eventstream, and you can, too!
output: index.html
controls: false
theme: jdan/cleaver-retro
style: style.css

--

# can.eventstream

And you can, too!

--

### Topics

* What are eventstreams?

* How are they coming to CanJS?

* What can I do with them?

--

### So what are they?

* Abstraction over event bindings
* Composable
* Reusable
* Declarative

--

### Standard event binding

```js
var clicks = can.compute();
$(window).on("click", () => clicks(clicks()+1));
clicks.bind("change", (one, two, three, bingo) => $("#clickcount").text(bingo));
```

--

### With event streams

```js
var clickStream = $(window).toEventStream("click");
var clicks = clickStream.scan(0, acc => acc+1);
clicks.assign($("#clickcount"), "text");
```
--

### Reuse them!

```js
// Go ahead and add logs elsewhere, anywhere.
clickStream.log("Window got a click");
clicks.filter(x => !(x%2)).log("clicked even number of times");

// And use the streams elsewhere...
import {clicks} from "mylib";

can.Component.extend({
...
   inserted: function() {
      clicks.filter(x => x % 2).assign(this.scope, "oddClicks");
   }
...
});
```
--

### When should I use them?

* [Turning events into observable app state](clicks.html)
* [Processing and transforming websocket data](statestream.html)
* [Complex event interactions without state machines](drag.html)
* [Live data structures](can.dataview.html)
* Cross-binding CanJS data structures to each other
* Recreating event "stacks" for debugging

### Links

* https://github.com/bitovi/can.bacon
* https://github.com/baconjs/bacon.js
* https://github.com/zkat/bacon-browser
