# Article 2

```javascript
document.addEventListener("DOMContentLoaded", () => {
  const domContainer = document.querySelector("#root");
  const root = ReactDOM.createRoot(domContainer);
  root.render(React.createElement(LikeButton)); // we are here
});
```

Now that we have a blank react canvas, it's time to render a component inside
it.

if we inspect the `LikeButton`, it's a functional component that returns a call
to `React.createElement`:

```javascript
() => {
  const [likes, setLikes] = React.useState(0);
  return React.createElement("button", { onClick: () => setLikes(likes + 1) }, `Like (${likes})`);
};
```

And we're passing this functional component to `React.createElement`. Let's dig
in and see how `createElement` does its magic...

## 1. Creating the Element

```javascript
// When stepping into `createElement`, we're sent to an alias called `createElementWithValidation`
function createElementWithValidation(type, props, children) {
  var validType = isValidElementType(type);

  if (!validType) {
    // (Seb) We generate an error message here...
  }
  var element = createElement.apply(this, arguments);

  if (element == null) {
    return element;
  }

  if (validType) {
    for (var i = 2; i < arguments.length; i++) {
      validateChildKeys(arguments[i], type);
    }
  }

  if (type === REACT_FRAGMENT_TYPE) {
    validateFragmentProps(element);
  } else {
    validatePropTypes(element);
  }

  return element;
}
```

The method starts with some type validation on the element (named `type` here).
Valid types specified in `isValidElementType` include functions, strings, and
more. Since our LikeButton is a function, we are good here, and validType will
be `true`. Moving on...

```javascript
var element = createElement.apply(this, arguments);
```

We create an element by passing the
[arguments](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)
array into `createElement.`

in our current example, arguments looks like:

```javascript
[
  () => {
    const [likes, setLikes] = React.useState(0);
    return React.createElement(
      "button",
      {
        onClick: () => setLikes(likes + 1),
      },
      `Like (${likes})`
    );
  },
];
```

So we are essentially passing our functional component into `createElement`.
Lets dive in and see what happens.

```javascript
function createElement(type, config, children) {
  var propName;

  var props = {};
  var key = null;
  var ref = null;
  var self = null;
  var source = null;

  if (config != null) {
    if (hasValidRef(config)) {
      ref = config.ref;

      {
        warnIfStringRefCannotBeAutoConverted(config);
      }
    }

    if (hasValidKey(config)) {
      {
        checkKeyStringCoercion(config.key);
      }

      key = "" + config.key;
    }

    self = config.__self === undefined ? null : config.__self;
    source = config.__source === undefined ? null : config.__source; // Remaining properties are added to a new props object

    for (propName in config) {
      if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
        props[propName] = config[propName];
      }
    }
  } // Children can be more than one argument, and those are transferred onto
  // the newly allocated props object.

  var childrenLength = arguments.length - 2;

  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    var childArray = Array(childrenLength);

    for (var i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }

    {
      if (Object.freeze) {
        Object.freeze(childArray);
      }
    }

    props.children = childArray;
  } // Resolve default props

  if (type && type.defaultProps) {
    var defaultProps = type.defaultProps;

    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  {
    if (key || ref) {
      var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;

      if (key) {
        defineKeyPropWarningGetter(props, displayName);
      }

      if (ref) {
        defineRefPropWarningGetter(props, displayName);
      }
    }
  }

  return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
}
```

This function is massive. Broken down, we first parse a config. Since our component doesn't have any
custom config, we can ignore that. We then do some work to figure out if our element has any children.

```javascript
var childrenLength = arguments.length - 2;

if (childrenLength === 1) {
  props.children = children;
} else if (childrenLength > 1) {
  var childArray = Array(childrenLength);

  for (var i = 0; i < childrenLength; i++) {
    childArray[i] = arguments[i + 2];
  }

  {
    if (Object.freeze) {
      Object.freeze(childArray);
    }
  }

  props.children = childArray;
} // Resolve default props
```

<details><summary>How children can be passed to React.createElement</summary>

When you call <code>React.createElement</code>, you can pass children in two
ways:

1\. As individual arguments after the props object 2\. As an array in the
props.children property

Here's a simple example to demonstrate:

<code>jsx // Method 1: Individual arguments React.createElement("div", null,
"Child 1", "Child 2", "Child 3");

// Method 2: Array in props React.createElement("div", { children: ["Child 1",
"Child 2", "Child 3"], });</code>

This explains why the code checks <code>arguments.length - 2</code> to determine
how many children there are (subtracting the type and props arguments). If
there's more than one child, it creates an array to hold them all.

</details>

In our case, `childrenLength` is -1, so we skip this and jump to this block.

```javascript
if (type && type.defaultProps) {
  var defaultProps = type.defaultProps;

  for (propName in defaultProps) {
    if (props[propName] === undefined) {
      props[propName] = defaultProps[propName];
    }
  }
}

{
  if (key || ref) {
    var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;

    if (key) {
      defineKeyPropWarningGetter(props, displayName);
    }

    if (ref) {
      defineRefPropWarningGetter(props, displayName);
    }
  }
}
```

since our element is a functional component without default props, and our
element doesn't have a key or ref we skip this too and end up here.

```javascript
return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
```

Now we (actually) create a `ReactElement`. Let's dive in.

```javascript
var ReactElement = function (type, key, ref, self, source, owner, props) {
  var element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,
    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: ref,
    props: props,
    // Record the component responsible for creating this element.
    _owner: owner,
  };

  {
    // The validation flag is currently mutative. We put it on
    // an external backing store so that we can freeze the whole object.
    // This can be replaced with a WeakMap once they are implemented in
    // commonly used development environments.
    element._store = {}; // To make comparing ReactElements easier for testing purposes, we make
    // the validation flag non-enumerable (where possible, which should
    // include every environment we run tests in), so the test framework
    // ignores it.

    Object.defineProperty(element._store, "validated", {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false,
    }); // self and source are DEV only properties.

    Object.defineProperty(element, "_self", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: self,
    }); // Two elements created in two different places should be considered
    // equal for testing purposes and therefore we hide it from enumeration.

    Object.defineProperty(element, "_source", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: source,
    });

    if (Object.freeze) {
      Object.freeze(element.props);
      Object.freeze(element);
    }
  }

  return element;
};
```

Here is a fresh ReactElement in all it's splendor. It's an object that looks
like so:

```javascript
{
    "key": null,
    "ref": null,
    "props": {},
    "_owner": null,
    "_store": {}
    "type": () => {
      const [likes, setLikes] = React.useState(0);
      return React.createElement(
        'button',
        { onClick: () => setLikes(likes + 1) },
        `Like (${likes})`
      );
    }
}
```

After constructing it, we
[freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
it + its props. This prevents bugs at the cost of freedom.

Now that we have created our element, let's bubble back up to
`React.createElementWithValidation`, where we do a null check against the
element we just created.

```javascript
var element = createElement.apply(this, arguments); // The result can be nullish if a mock or a custom function is used.

if (element == null) {
  return element;
}
```

The comment above the check explains why - the element can be nullish if a mock
or a custom function is used. if the result is nullish, we return early. This is
not the case here, so we resume.

```javascript
if (validType) {
  for (var i = 2; i < arguments.length; i++) {
    validateChildKeys(arguments[i], type);
  }
}

if (type === REACT_FRAGMENT_TYPE) {
  validateFragmentProps(element);
} else {
  validatePropTypes(element);
}

return element;
```

We take any children, and perform validation on them, before returning the
element. Since our LikeButton has no children, we bubble back up, and are ready
to render our `LikeButton`.

## 2. Rendering the Element

```javascript
root.render(React.createElement(LikeButton));
```

lets pass the element into `root.render(...)` and see how rendering works...

```javascript
ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = function (children) {
  var root = this._internalRoot;

  if (root === null) {
    throw new Error("Cannot update an unmounted root.");
  }

  {
    if (typeof arguments[1] === "function") {
      error(
        "render(...): does not support the second callback argument. " +
          "To execute a side effect after rendering, declare it in a component body with useEffect()."
      );
    } else if (isValidContainer(arguments[1])) {
      error(
        "You passed a container to the second argument of root.render(...). " +
          "You don't need to pass it again since you already passed it to create the root."
      );
    } else if (typeof arguments[1] !== "undefined") {
      error("You passed a second argument to root.render(...) but it only accepts " + "one argument.");
    }

    var container = root.containerInfo;

    if (container.nodeType !== COMMENT_NODE) {
      var hostInstance = findHostInstanceWithNoPortals(root.current);

      if (hostInstance) {
        if (hostInstance.parentNode !== container) {
          error(
            "render(...): It looks like the React-rendered content of the " +
              "root container was removed without using React. This is not " +
              "supported and will cause errors. Instead, call " +
              "root.unmount() to empty a root's container."
          );
        }
      }
    }
  }

  updateContainer(children, root, null, null);
};
```

We do some validation, and then call `updateContainer` if everything went fine, which it did.

```javascript
function updateContainer(element, container, parentComponent, callback) {
  {
    onScheduleRoot(container, element);
  }

  var current$1 = container.current;
  var eventTime = requestEventTime();
  var lane = requestUpdateLane(current$1);

  {
    markRenderScheduled(lane);
  }

  var context = getContextForSubtree(parentComponent);

  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  {
    if (isRendering && current !== null && !didWarnAboutNestedUpdates) {
      didWarnAboutNestedUpdates = true;

      error(
        "Render methods should be a pure function of props and state; " +
          "triggering nested component updates from render is not allowed. " +
          "If necessary, trigger nested updates in componentDidUpdate.\n\n" +
          "Check the render method of %s.",
        getComponentNameFromFiber(current) || "Unknown"
      );
    }
  }

  var update = createUpdate(eventTime, lane); // Caution: React DevTools currently depends on this property
  // being called "element".

  update.payload = {
    element: element,
  };
  callback = callback === undefined ? null : callback;

  if (callback !== null) {
    {
      if (typeof callback !== "function") {
        error(
          "render(...): Expected the last optional `callback` argument to be a " + "function. Instead received: %s.",
          callback
        );
      }
    }

    update.callback = callback;
  }

  var root = enqueueUpdate(current$1, update, lane);

  if (root !== null) {
    scheduleUpdateOnFiber(root, current$1, lane, eventTime);
    entangleTransitions(root, current$1, lane);
  }

  return lane;
}
```

This method looks like a lot, but it's really just doing 2 things:

- enqueing the UI update
- processing any updates in the queue

Dissected further, we're gonna do the following

1. enqueing the update
   1. create the update
   2. add it to the queue
   3. track/ update any metadata (mark lanes, set eventTimings, and mark the root as having pendingUpdates)
2. process any updates in the queue

This gives us a little teaser at what's coming. Let's go ahead and break the code down piece by piece.

## 2.1.1 Enqueue the Update (Creating the Update)

We'll ignore code wrapped in `{...}`, since this code only runs on dev builds:

```javascript
{
  onScheduleRoot(container, element); // (seb) we're gonna ignore this...
}

var current$1 = container.current;
var eventTime = requestEventTime();
var lane = requestUpdateLane(current$1);
```

`current$1` points to the container(a `FiberRootNode`)'s main `FiberNode`. Recall that
`FiberRootNode` is the container where React stores all the information about our
component tree, and the `FiberNode` is the literal `ReactFiber` within it.

`eventTime` represents when this update was requested, and `lane` represents the
priority level of this update (`lane` is `16` here).

<details><summary>More about lanes and event timing</summary>

The <code>lane</code> concept is React's way of prioritizing updates. Different
types of updates (like user interactions vs background updates) get assigned
different priority lanes. Higher priority lanes get processed first. This allows
React to be responsive to important updates while deferring less critical work.

The <code>eventTime</code> timestamp helps React track when updates were
requested, which it uses along with the lane priority to make scheduling
decisions. For example, if a low priority update has been waiting too long,
React may bump up its priority.

</details>

```javascript
{
  markRenderScheduled(lane); // (seb) skipping this...
}

var context = getContextForSubtree(parentComponent);
```

We call `getContextForSubtree(...)` with a `parentComponent` of null. This makes
sense - this component tree is empty, so no context exists yet. As a result, `context` = `{}`.

```javascript
if (container.context === null) {
  container.context = context;
} else {
  container.pendingContext = context;
}
```

Since the context is `null`, we set the container's context prop to `{}`.

```javascript
{
  // (seb) skipping this...
  if (isRendering && current !== null && !didWarnAboutNestedUpdates) {
    didWarnAboutNestedUpdates = true;

    error(
      "Render methods should be a pure function of props and state; " +
        "triggering nested component updates from render is not allowed. " +
        "If necessary, trigger nested updates in componentDidUpdate.\n\n" +
        "Check the render method of %s.",
      getComponentNameFromFiber(current) || "Unknown"
    );
  }
}

var update = createUpdate(eventTime, lane);
```

We call `createUpdate` with the `eventTime` (1787418) and the `lane` (16). Let's
see what an update entails...

```javascript
function createUpdate(eventTime, lane) {
  var update = {
    eventTime: eventTime,
    lane: lane,
    tag: UpdateState,
    payload: null,
    callback: null,
    next: null,
  };
  return update;
}
```

An update is an object that tracks information about a pending state change:

- eventTime: When the update was created
- lane: The priority level of the update
- tag: The type of update (UpdateState in this case)
- payload: The actual state changes (null for now)
- callback: Optional callback to run after update is processed
- next: Pointer to form a linked list of updates

we return this `update`, and continue.

```javascript
update.payload = {
  element: element,
};

callback = callback === undefined ? null : callback;
if (callback !== null) {
  {
    if (typeof callback !== "function") {
      error(
        "render(...): Expected the last optional `callback` argument to be a " + "function. Instead received: %s.",
        callback
      );
    }
  }

  update.callback = callback;
}
```

We insert our React.element into the update's payload object. We also check if a
callback is present and valid; if so, we insert it in the update's `callback`
prop.

## 2.1.2 Enqueue the Update (Add it to the Queue)

Now that we have a proper update, let's go ahead and enqueue it.

```javascript
var root = enqueueUpdate(current$1, update, lane);

if (root !== null) {
  scheduleUpdateOnFiber(root, current$1, lane, eventTime);
  entangleTransitions(root, current$1, lane);
}

return lane;
```

We enqueue the update by passing `current$1` (the fiber node, which is
currently empty), the `update` object, and the `lane` (16) into the
enqueueUpdate function. Let's see what that does.

```javascript
function enqueueUpdate(fiber, update, lane) {
  var updateQueue = fiber.updateQueue;

  if (updateQueue === null) {
    // Only occurs if the fiber has been unmounted.
    return null;
  }

  var sharedQueue = updateQueue.shared;

  {
    if (currentlyProcessingQueue === sharedQueue && !didWarnUpdateInsideUpdate) {
      error(
        "An update (setState, replaceState, or forceUpdate) was scheduled " +
          "from inside an update function. Update functions should be pure, " +
          "with zero side-effects. Consider using componentDidUpdate or a " +
          "callback."
      );

      didWarnUpdateInsideUpdate = true;
    }
  }

  if (isUnsafeClassRenderPhaseUpdate()) {
    // This is an unsafe render phase update. Add directly to the update
    // queue so we can process it immediately during the current render.
    var pending = sharedQueue.pending;

    if (pending === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      update.next = pending.next;
      pending.next = update;
    }

    sharedQueue.pending = update; // Update the childLanes even though we're most likely already rendering
    // this fiber. This is for backwards compatibility in the case where you
    // update a different component during render phase than the one that is
    // currently renderings (a pattern that is accompanied by a warning).

    return unsafe_markUpdateLaneFromFiberToRoot(fiber, lane);
  } else {
    return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
  }
}
```

we first pull the `updateQueue` from the Fiber, and run some checks on it. To
refresh us, here's what that queue looks like:

```javascript
{
    "baseState": {
        "element": null,
        "isDehydrated": false,
        "cache": null,
        "transitions": null,
        "pendingSuspenseBoundaries": null
    },
    "firstBaseUpdate": null,
    "lastBaseUpdate": null,
    "shared": {
        "pending": null,
        "interleaved": null,
        "lanes": 0
    },
    "effects": null
}
```

going back to the code...

```javascript
if (updateQueue === null) {
  // Only occurs if the fiber has been unmounted.
  return null;
}

var sharedQueue = updateQueue.shared;
```

we first run a null check, and pull out the `sharedQueue`:

```javascript
{
  if (currentlyProcessingQueue === sharedQueue && !didWarnUpdateInsideUpdate) {
    error(
      "An update (setState, replaceState, or forceUpdate) was scheduled " +
        "from inside an update function. Update functions should be pure, " +
        "with zero side-effects. Consider using componentDidUpdate or a " +
        "callback."
    );

    didWarnUpdateInsideUpdate = true;
  }
}
```

We then perform some dev mode error logging if we detect that we're scheduling an update from inside another update's processing. This helps catch potential issues with side effects in update functions.

```js
if (isUnsafeClassRenderPhaseUpdate()) {
  // This is an unsafe render phase update. Add directly to the update
  // queue so we can process it immediately during the current render.
  var pending = sharedQueue.pending;

  if (pending === null) {
    // This is the first update. Create a circular list.
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }

  sharedQueue.pending = update; // Update the childLanes even though we're most likely already rendering
  // this fiber. This is for backwards compatibility in the case where you
  // update a different component during render phase than the one that is
  // currently renderings (a pattern that is accompanied by a warning).

  return unsafe_markUpdateLaneFromFiberToRoot(fiber, lane);
} else {
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
}
```

Next, we call `isUnsafeClassRenderPhaseUpdate` to see if there's already a pending update in the shared queue. If there is, we append our new update to the circular linked list of updates. If not, we create a new circular list with just this update.

<details>
<summary>Example of an unsafe class render phase update that would trigger this path</summary>

```jsx
class BadComponent extends React.Component {
  state = { count: 0 };

  render() {
    // BAD: Setting state during render
    // This is an anti-pattern that can cause infinite loops
    // and violates React's principles of pure render functions
    if (this.state.count === 0) {
      this.setState({ count: this.state.count + 1 });
    }

    return <div>Count: {this.state.count}</div>;
  }
}
```

</details>

<details>
<summary>Why does React use a circular linked list for updates?</summary>

React uses a circular linked list data structure to track updates for several key reasons:

1. **Efficient Insertion**: Adding new updates is O(1) since we only need to modify a few pointers, regardless of how many updates are already queued.

2. **Memory Efficiency**: The circular structure means we don't need separate head/tail pointers or null termination - the "end" points back to the start.

3. **Batch Processing**: React can easily process all updates in order by following the circle exactly once, starting anywhere in the list.

4. **Update Priority**: The circular structure makes it simple to insert high-priority updates at any point in the queue while maintaining the circular property.

</details>

In our case, this is not relevant, and we simply call `enqueueConcurrentClassUpdate(...)` with the empty Fiber, the sharedQueue, the update to be performed, and the lane.

```javascript
function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
  var interleaved = queue.interleaved;

  if (interleaved === null) {
    // This is the first update. Create a circular list.
    update.next = update; // At the end of the current render, this queue's interleaved updates will
    // be transferred to the pending queue.

    pushConcurrentUpdateQueue(queue);
  } else {
    update.next = interleaved.next;
    interleaved.next = update;
  }

  queue.interleaved = update;
  return markUpdateLaneFromFiberToRoot(fiber, lane);
}
```

we extract the interleaved property of the queue and condition on it. Since it is null, we go down the first branch:

```js
// This is the first update. Create a circular list.
update.next = update; // At the end of the current render, this queue's interleaved updates will
// be transferred to the pending queue.

pushConcurrentUpdateQueue(queue);
```

It's null because this is the first update, so we point update.next to update itself, and then call `pushConcurrentUpdateQueue`.

```js
var concurrentQueues = null;

function pushConcurrentUpdateQueue(queue) {
  if (concurrentQueues === null) {
    concurrentQueues = [queue];
  } else {
    concurrentQueues.push(queue);
  }
}
```

this function simply adds the queue to a global array of concurrent queues. If the array is empty (null), it initializes it with the queue, otherwise it appends the queue to the existing array.

## 2.1.3 Enqueue the Update (Update Metadata)

```js
root.render(...)
    ↓
    updateContainer(...)
        ↓
        createUpdate(...)
            ↓
        enqueueUpdate(...)
            ↓
            enqueueConcurrentClassUpdate(...)
                ↓
                pushConcurrentUpdateQueue(...)
                ↓ // we are here, right before running markUpdateLaneFromFiberToRoot.
                markUpdateLaneFromFiberToRoot(...)
```

Now that the update is queued, we are gonna start updating metadata throughout the tree.

```js
queue.interleaved = update;
return markUpdateLaneFromFiberToRoot(fiber, lane);
```

We set the `interleaved` prop of the queue to the `update`, and then call `markUpdateLaneFromFiberToRoot`.

<details><summary>What are interleaved updates?</summary>

Interleaved updates are React's way of handling multiple updates that occur during an ongoing render. The term "interleaved" refers to how these updates are woven together in a circular linked list.

When updates come in while React is already processing other updates:

1. They are added to the interleaved queue rather than the main pending queue
2. They form a circular linked list where each update points to the next one, and the last points back to the first
3. At the end of the current render, these interleaved updates are transferred to the pending queue to be processed

This system allows React to:

- Track updates that arrive during an ongoing render
- Maintain the order of updates
- Process them efficiently in batches
- Preserve update priority through the lanes system

The circular list structure makes it easy to append new updates and transfer the whole chain of updates at once when needed.

</details>

```js
function markUpdateLaneFromFiberToRoot(sourceFiber, lane) {
  // Update the source fiber's lanes
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  // ...
}
```

if we look at `mergeLanes`, we see it performs a bitwise OR

```js
function mergeLanes(a, b) {
  return a | b;
}
```

this means lanes are actually a bitflag! good to know. Let's continue.

```js
var alternate = sourceFiber.alternate;

if (alternate !== null) {
  alternate.lanes = mergeLanes(alternate.lanes, lane);
}
```

This function marks the source fiber and its alternate with the update lane by merging it with their existing lanes. Our fiber has an alternate of `null`, so we can ignore this for now.

<summary>What are alternate fibers?</summary>

Alternate fibers are part of React's double buffering mechanism for concurrent rendering. Each fiber node can have an "alternate" version that represents its state in a work-in-progress tree. When React performs concurrent rendering:

1. The current tree represents what's currently displayed on screen
2. The work-in-progress tree (made up of alternate fibers) represents the future state being prepared

This double buffering allows React to prepare new renders in memory without affecting the current UI. If the work-in-progress render is interrupted or discarded, React can simply continue showing the current tree. When the new render is ready, React can quickly switch the alternate tree to become the current one.

The alternate fiber pairs (current and work-in-progress) are connected bidirectionally and flip roles after each successful render.

</details>

Let's walk through what happens next:

```js
{
  if (alternate === null && (sourceFiber.flags & (Placement | Hydrating)) !== NoFlags) {
    warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
  }
} // Walk the parent path to the root and update the child lanes.
```

This is a dev-only warning to catch updates on fibers that haven't been mounted yet. This can happen when a component updates during its construction phase.

<details>
<summary>Updating an unmounted fiber</summary>

Consider this problematic component:

```jsx
class ProblematicComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
    };
    this.incrementCount = this.incrementCount.bind(this);
  }

  componentDidMount() {
    this.incrementCount();
  }

  incrementCount() {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return <div>Count: {this.state.count}</div>;
  }
}

class ParentComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showChild: true,
    };
  }

  componentDidMount() {
    // Simulate unmounting the child component after a delay
    setTimeout(() => {
      this.setState({ showChild: false });
    }, 1000);
  }

  render() {
    return <div>{this.state.showChild ? <ProblematicComponent /> : null}</div>;
  }
}
```

</details>

let's continue...

```js
var node = sourceFiber;
var parent = sourceFiber.return;

while (parent !== null) {
  parent.childLanes = mergeLanes(parent.childLanes, lane);
  alternate = parent.alternate;

  if (alternate !== null) {
    alternate.childLanes = mergeLanes(alternate.childLanes, lane);
  } else {
    {
      if ((parent.flags & (Placement | Hydrating)) !== NoFlags) {
        warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
      }
    }
  }

  node = parent;
  parent = parent.return;
}
```

Here we start a while loop that traverses up the fiber tree, merging the current node's lane with it's parent's lane (and it's parent's alternate lane too, if it exists).

Since we're mounting into the root fiber (which has no parent), the loop never actually runs. Let's continue.

```js
if (node.tag === HostRoot) {
  var root = node.stateNode;
  return root;
} else {
  return null;
}
```

Finally, if the node we ended up at is a HostRoot (it is!), we return its stateNode (the `FiberRootNode`).

And with that, we've updated metadata throughout the tree. This completes the enqueueing step!

## 2.2 Process the Update Queue

Now that the queue is loaded up with some work, let's start to process it.

```js
root.render(...)
    ↓
    updateContainer(...) // we're back here ...
        ↓
        createUpdate(...)
            ↓
        enqueueUpdate(...) // ...because this just finished
            ↓
            enqueueConcurrentClassUpdate(...)
                ↓
                pushConcurrentUpdateQueue(...);
                ↓
                markUpdateLaneFromFiberToRoot(...);
```

Let's bubble back up, and see that we end up back in `updateContainer`.

```js
// (seb) updateContainer
var root = enqueueUpdate(current$1, update, lane);

if (root !== null) {
  // (seb) we're here now
  scheduleUpdateOnFiber(root, current$1, lane, eventTime);
  entangleTransitions(root, current$1, lane);
}
```

`root` is now the `RootFiberNode`. It's assuredly not null, so we go ahead and call `scheduleUpdateOnFiber` and `entangleTransitions` on it.

```js
// (seb) updateContainer => scheduleUpdateOnFiber
function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  checkForNestedUpdates();

  {
    if (isRunningInsertionEffect) {
      error("useInsertionEffect must not schedule updates.");
    }
  }

  {
    if (isFlushingPassiveEffects) {
      didScheduleUpdateDuringPassiveEffects = true;
    }
  } // Mark that the root has a pending update.

  markRootUpdated(root, lane, eventTime);
  // ...
}
```

After performing checks for nested updates and running some dev-mode validations (none of which raise concerns), we proceed to call `markRootUpdated`.

It's worth noting the metadata updating process still happens throughout the render cycle (it's not isolated to section 2.1.3 after all... sorry!)

<details>
    <summary>What does checkForNestedUpdates do?</summary>

This function prevents infinite update loops by tracking how many nested updates have occurred. It throws an error if updates are too deeply nested.

There are two types of limits it checks:

1. Regular updates (like setState in componentWillUpdate/componentDidUpdate) - Limited to NESTED_UPDATE_LIMIT (in my react build, this was 50)
2. Passive updates (like setState in useEffect) - Limited to NESTED_PASSIVE_UPDATE_LIMIT

If either limit is exceeded, it resets the counter and throws an error explaining the likely cause - either repeated setState calls in lifecycle methods, or useEffect dependencies that change every render.

This is a safeguard against common mistakes that could cause infinite render loops and crash the application.

```js
function checkForNestedUpdates() {
  if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
    nestedUpdateCount = 0;
    rootWithNestedUpdates = null;
    throw new Error(
      "Maximum update depth exceeded. This can happen when a component " +
        "repeatedly calls setState inside componentWillUpdate or " +
        "componentDidUpdate. React limits the number of nested updates to " +
        "prevent infinite loops."
    );
  }

  {
    if (nestedPassiveUpdateCount > NESTED_PASSIVE_UPDATE_LIMIT) {
      nestedPassiveUpdateCount = 0;
      rootWithPassiveNestedUpdates = null;

      error(
        "Maximum update depth exceeded. This can happen when a component " +
          "calls setState inside useEffect, but useEffect either doesn't " +
          "have a dependency array, or one of the dependencies changes on " +
          "every render."
      );
    }
  }
}
```

</details>

```js
// (seb) updateContainer => scheduleUpdateOnFiber => markRootUpdated
function markRootUpdated(root, updateLane, eventTime) {
  root.pendingLanes |= updateLane; // If there are any suspended transitions, it's possible this new update
  // could unblock them. Clear the suspended lanes so that we can try rendering
  // them again.
  //
  // TODO: We really only need to unsuspend only lanes that are in the
  // `subtreeLanes` of the updated fiber, or the update lanes of the return
  // path. This would exclude suspended updates in an unrelated sibling tree,
  // since there's no way for this update to unblock it.
  //
  // We don't do this if the incoming update is idle, because we never process
  // idle updates until after all the regular updates have finished; there's no
  // way it could unblock a transition.

  if (updateLane !== IdleLane) {
    root.suspendedLanes = NoLanes;
    root.pingedLanes = NoLanes;
  }

  var eventTimes = root.eventTimes;
  var index = laneToIndex(updateLane); // We can always overwrite an existing timestamp because we prefer the most
  // recent event, and we assume time is monotonically increasing.

  eventTimes[index] = eventTime;
}
```

the `updateLane`(16) and `IdleLane`(536870912) don't match, so we set `suspended` and `pinged` lanes to `NoLanes`.

<details>
<summary>Why do we clear suspended and pinged lanes on non-idle updates?</summary>

When a new update comes in (that isn't an idle update), we clear the suspended and pinged lanes because:

1. This new update might contain changes that could resolve whatever caused the previous updates to suspend. For example:

   - A suspended data fetch may have completed
   - Props or state changes may satisfy conditions that previously caused suspension

2. By clearing these lanes, we allow React to re-attempt rendering the previously suspended work along with this new update, potentially unblocking the suspended transitions.

3. We specifically don't do this for idle updates because:
   - Idle updates are processed after all regular updates complete
   - They can't unblock transitions by design
   - There's no point clearing suspension state for idle updates since they won't affect suspended work

Some context on suspended and pinged lanes:

- Suspended lanes represent work that couldn't complete because some data/resource wasn't ready (like when using Suspense)

  - When a component suspends, its lane is moved to suspendedLanes
  - This tells React "this work needs to wait for something"

- Pinged lanes are suspended lanes that have been "pinged" to indicate their data is now available
  - When suspended data becomes available, the lane gets "pinged"
  - This tells React "this suspended work can now be retried"

By clearing both when a new update arrives, React optimistically assumes the new update might resolve whatever caused the suspension, rather than trying to track exactly which updates might unblock which suspended work.

</details>

```js
// (seb) updateContainer => scheduleUpdateOnFiber => markRootUpdated
var eventTimes = root.eventTimes;
var index = laneToIndex(updateLane); // We can always overwrite an existing timestamp because we prefer the most
// recent event, and we assume time is monotonically increasing.

eventTimes[index] = eventTime;
```

`eventTimes` is an array that tracks timestamps for each lane's most recent update. It has 31 slots (one for each lane), initialized with zeros. When an update comes in for a particular lane, we store its timestamp in the corresponding index. This helps React track when updates occurred and maintain proper update ordering based on time.

We then call `laneToIndex`. lets see how that works...

```js
// (seb) updateContainer => scheduleUpdateOnFiber => markRootUpdated => laneToIndex
function laneToIndex(lane) {
  return pickArbitraryLaneIndex(lane);
}
function pickArbitraryLaneIndex(lanes) {
  return 31 - clz32(lanes);
}
```

It seems to convert the lane bitmask into an array index (0-30).

This uses a method I've never seen before on the Math object: [ clz32 ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32). It counts the leading zeroes of a binary number, which is how we turn the lane bitmask into a index.

```js
// (seb) updateContainer => scheduleUpdateOnFiber => markRootUpdated
var index = laneToIndex(updateLane); // We can always overwrite an existing timestamp because we prefer the most
// recent event, and we assume time is monotonically increasing.

eventTimes[index] = eventTime;
```

the index has a value of `4` (makes sense, since `2^4 === 16`). with this, we have an index to key off of within eventTimes. We set `eventTimes[4] = 16305.39999999851`, and bubble out of `markRootUpdated` and back into `scheduleUpdateOnFiber`:

```js
// (seb) updateContainer => scheduleUpdateOnFiber
markRootUpdated(root, lane, eventTime);

if ((executionContext & RenderContext) !== NoLanes && root === workInProgressRoot) {
  // This update was dispatched during the render phase. This is a mistake
  // if the update originates from user space (with the exception of local
  // hook updates, which are handled differently and don't reach this
  // function), but there are some internal React features that use this as
  // an implementation detail, like selective hydration.
  warnAboutRenderPhaseUpdatesInDEV(fiber); // Track lanes that were updated during the render phase
} else {
  // This is a normal update, scheduled from outside the render phase. For
  // example, during an input event.
  {
    if (isDevToolsPresent) {
      addFiberToLanesMap(root, fiber, lane);
    }
  }

  warnIfUpdatesNotWrappedWithActDEV(fiber);

  if (root === workInProgressRoot) {
    // Received an update to a tree that's in the middle of rendering. Mark
    // that there was an interleaved update work on this root. Unless the
    // `deferRenderPhaseUpdateToNextBatch` flag is off and this is a render
    // phase update. In that case, we don't treat render phase updates as if
    // they were interleaved, for backwards compat reasons.
    if ((executionContext & RenderContext) === NoContext) {
      workInProgressRootInterleavedUpdatedLanes = mergeLanes(workInProgressRootInterleavedUpdatedLanes, lane);
    }

    if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
      // The root already suspended with a delay, which means this render
      // definitely won't finish. Since we have a new update, let's mark it as
      // suspended now, right before marking the incoming update. This has the
      // effect of interrupting the current render and switching to the update.
      // TODO: Make sure this doesn't override pings that happen while we've
      // already started rendering.
      markRootSuspended$1(root, workInProgressRootRenderLanes);
    }
  }

  ensureRootIsScheduled(root, eventTime);

  if (
    lane === SyncLane &&
    executionContext === NoContext &&
    (fiber.mode & ConcurrentMode) === NoMode && // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
    !ReactCurrentActQueue$1.isBatchingLegacy
  ) {
    // Flush the synchronous work now, unless we're already working or inside
    // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
    // scheduleCallbackForFiber to preserve the ability to schedule a callback
    // without immediately flushing it. We only do this for user-initiated
    // updates, to preserve historical behavior of legacy mode.
    resetRenderTimer();
    flushSyncCallbacksOnlyInLegacyMode();
  }
}
```

We perform a ton of checks (none fail), and reach this line

```js
// (seb) updateContainer => scheduleUpdateOnFiber
ensureRootIsScheduled(root, eventTime);
```

lets step in and see what it does.

```js
// (seb) updateContainer => scheduleUpdateOnFiber => ensureRootIsScheduled
function ensureRootIsScheduled(root, currentTime) {
  var existingCallbackNode = root.callbackNode; // Check if any lanes are being starved by other work. If so, mark them as
  // expired so we know to work on those next.

  markStarvedLanesAsExpired(root, currentTime); // Determine the next lanes to work on, and their priority.
  //...
```

The method's first line of business is to reprioritize any work that has been pending for too long. We do this via a call to `markStarvedLanesAsExpired(...)`, which under the hood checks if lanes have "expired". If so, we mark them as expired, which begs the scheduler to reprioritize them (if they need to be completed) or get rid of them (if the work is no longer necessary).

<details>
    <summary>What is expiration in React?</summary>

Expiration in React is a mechanism to ensure work doesn't get starved indefinitely. Each unit of work (represented by a lane) gets an expiration time calculated via computeExpirationTime.

The expiration time varies based on the lane type:

1. High priority lanes (Sync, InputContinuous) expire after 250ms
2. Default and Transition lanes expire after 5000ms (5 seconds)

When work expires:

- It gets marked as expired via markStarvedLanesAsExpired
- This forces React to prioritize it in the next scheduling cycle
- If the work is no longer needed, it can be discarded

This prevents lower priority updates from being perpetually delayed by higher priority ones, while still maintaining React's priority-based scheduling system.

The expiration system acts as a safeguard against starvation, ensuring all updates eventually get processed even in busy applications.

</details>

We also pull out the `callbackNode`, which is `null`. The `callbackNode` is a reference to the currently scheduled task for this `root`, so it being null makes sense (work is queued, but has not been scheduled yet).

<details>
    <summary>What is callbackNode?</summary>

The callbackNode is a reference to the currently scheduled task for this root. It's used by React to:

1. Track if there's already work scheduled for this root
2. Cancel existing work if priorities change
3. Reuse existing tasks when possible for performance

The callbackNode comes from the Scheduler package and represents either:

- A scheduled synchronous task
- A scheduled concurrent task
- null if no task is currently scheduled

When React needs to schedule new work, it checks the existing callbackNode to determine if it can reuse the task or needs to schedule a new one. This helps prevent unnecessary task scheduling and cancellations.

The callbackNode works together with callbackPriority to manage the scheduling and prioritization of updates through React's fiber tree.

</details>

```js
// (seb) updateContainer => scheduleUpdateOnFiber => ensureRootIsScheduled
var nextLanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes);
```

we then get the "next lanes" - these represent the set of lanes (updates) that need to be processed next.

The lanes are determined by looking at the root's pending lanes, suspended lanes, and expiration times. If we're currently rendering (root === workInProgressRoot), we also consider the lanes currently being worked on (workInProgressRootRenderLanes) to avoid scheduling redundant work.

This is a good point to read more about lanes before continuing. You can read more about them here.

< insert lanes article here (lanes.md)>

After `getNextLanes` returns, `nextLanes` is 16. This makes sense - we have one update queued in the fiber's update queue, and it's been marked with lane 16 (the default priority).

```js
if (nextLanes === NoLanes) {
  // Special case: There's nothing to work on.
  if (existingCallbackNode !== null) {
    cancelCallback$1(existingCallbackNode);
  }

  root.callbackNode = null;
  root.callbackPriority = NoLane;
  return;
}
```

since nextLanes is 16, this branch is not hit. This branch catches situations where there is nothing to work on, which is def not the case for us right now.

```js
// We use the highest priority lane to represent the priority of the callback.
var newCallbackPriority = getHighestPriorityLane(nextLanes);
// Check if there's an existing task. We may be able to reuse it.
var existingCallbackPriority = root.callbackPriority;
```

we then get the highest priority of the upcoming work (16), and the priority of the current work (0)...

```js
if (
  existingCallbackPriority === newCallbackPriority && // Special case related to `act`. If the currently scheduled task is a
  // Scheduler task, rather than an `act` task, cancel it and re-scheduled
  // on the `act` queue.
  !(ReactCurrentActQueue$1.current !== null && existingCallbackNode !== fakeActCallbackNode)
) {
  {
    // If we're going to re-use an existing task, it needs to exist.
    // Assume that discrete update microtasks are non-cancellable and null.
    // TODO: Temporary until we confirm this warning is not fired.
    if (existingCallbackNode == null && existingCallbackPriority !== SyncLane) {
      error(
        "Expected scheduled callback to exist. This error is likely caused by a bug in React. Please file an issue."
      );
    }
  } // The priority hasn't changed. We can reuse the existing task. Exit.

  return;
}
```

... and check if they match. They don't so we continue.

However, if they did match, this means we can reuse the existing scheduled task to process our work, so we can simply return early. In other words, we already have a task in the scheduler that will process updates at this priority level.

There is also mention of an `act` queue. This is an edgecase we don't need to worry about, so we resume.

<details>
    <summary>About the act queue</summary>
    
    The `act` queue is a special queue used for testing React components. When running tests with React's `act()` utility:
    
    - It ensures all updates are processed and applied before making assertions
    - Maintains a separate queue from normal React updates
    - Can batch multiple updates together
    - Helps prevent test flakiness by waiting for all updates to complete
    
    The check `ReactCurrentActQueue$1.current !== null` determines if we're currently within an `act()` call, and if so,
    uses the special act queue instead of the normal scheduling mechanisms.
  </details>

```js
if (existingCallbackNode != null) {
  // Cancel the existing callback. We'll schedule a new one below.
  cancelCallback$1(existingCallbackNode);
}
```

we're about to schedule the work. if a callback is loaded, we cancel it since we're about to schedule a new one.

```js
// Schedule a new callback.

var newCallbackNode;

if (newCallbackPriority === SyncLane) {
  // Special case: Sync React callbacks are scheduled on a special
  // internal queue
} else {
  // ...
}
```

we check if the new unit of work is a sync. if it is, we handle it differently. Since this is a render, we can skip this entirely, and jump straight into the else block...

<details>
    <summary>About sync callbacks</summary>
    
    Sync callbacks are special high-priority tasks that React needs to process immediately. They are:

    - Scheduled on a dedicated internal queue separate from normal work
    - Always processed synchronously (blocking) rather than concurrently
    - Cannot be interrupted by other work
    - Commonly used for:
      - Legacy mode updates
      - Updates that must complete immediately
      - Critical UI interactions

    React handles sync callbacks differently from other work to ensure they complete as quickly as possible,
    even if it means temporarily blocking the main thread.

</details>

```js
  } else {
    var schedulerPriorityLevel;

    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediatePriority;
        break;

      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingPriority;
        break;

      case DefaultEventPriority:
        schedulerPriorityLevel = NormalPriority;
        break;

      case IdleEventPriority:
        schedulerPriorityLevel = IdlePriority;
        break;

      default:
        schedulerPriorityLevel = NormalPriority;
        break;
    }

    newCallbackNode = scheduleCallback$1(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root));
  }

  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
} // This is the entry point for every concurrent task, i.e. anything that
  // goes through Scheduler.
```

we determine the priority level of the event by passing nextLanes(16) into lanesToEventPriority. This helper takes a set of lanes and converts them into an event priority level by:

1. Finding the highest priority lane in the set using getHighestPriorityLane()
2. Checking the lane against different event priority thresholds in descending order:
   - If it's higher or equal to DiscreteEventPriority (1, the highest), return DiscreteEventPriority
   - If it's higher or equal to ContinuousEventPriority (4), return ContinuousEventPriority
   - If it includes any non-idle work (work that needs to be processed with some urgency, as opposed to work which can be done when the browser is idle), return DefaultEventPriority
   - Otherwise return IdleEventPriority (lowest)

in our case, rendering is non-idle work, so we return a DefaultEventPriority (just so happens to be 16 too). As a result, our `schedulerPriorityLevel` is assigned a value of `NormalPriority`.

and with that, we schedule a new callback by calling scheduleCallback with the priorityLevel.

we then assign the root's callbackPriority to the newCallbackPriority (16) and the callbackNode to the callback we just scheduled.

Let's see how scheduleCallback works.

```js
function scheduleCallback$1(priorityLevel, callback) {
  {
    // If we're currently inside an `act` scope, bypass Scheduler and push to
    // the `act` queue instead.
    var actQueue = ReactCurrentActQueue$1.current;

    if (actQueue !== null) {
      actQueue.push(callback);
      return fakeActCallbackNode;
    } else {
      return scheduleCallback(priorityLevel, callback);
    }
  }
}
```

this is a wrapper around scheduleCallback which checks if `act` (a react component testing library) is being used. since this is not the case, we go ahead and call the real scheduleCallback...

```js
function unstable_scheduleCallback(priorityLevel, callback, options) {
  var currentTime = getCurrentTime();
  var startTime;

  if (typeof options === "object" && options !== null) {
    var delay = options.delay;

    if (typeof delay === "number" && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }
```

we get the currentTime and set startTime to it. if options were passed (not the case), we'd extract a delay from them, and factor it into the startTime.

```js
var timeout;

switch (priorityLevel) {
  case ImmediatePriority:
    timeout = IMMEDIATE_PRIORITY_TIMEOUT;
    break;

  case UserBlockingPriority:
    timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
    break;

  case IdlePriority:
    timeout = IDLE_PRIORITY_TIMEOUT;
    break;

  case LowPriority:
    timeout = LOW_PRIORITY_TIMEOUT;
    break;

  case NormalPriority:
  default:
    timeout = NORMAL_PRIORITY_TIMEOUT;
    break;
}
```

we then use the `priorityLevel` to deterimine a timeout for the work to be done. Since we're dealing with a `NormalPriority` unit of work, we set timeout to `NORMAL_PRIORITY_TIMEOUT` (5000 ms).

```js
var expirationTime = startTime + timeout;
var newTask = {
  id: taskIdCounter++,
  callback: callback,
  priorityLevel: priorityLevel,
  startTime: startTime,
  expirationTime: expirationTime,
  sortIndex: -1,
};
```

we use the `startTime` + `timeout` to demark the `expirationTime` (we saw expiration times earlier, in `ensureRootIsScheduled`). we then build the `newTask`, which is an object containing:

```js
{
    "id": 1, // a unique id for the task, incremented from taskIdCounter
    "callback": ..., // the actual function to be executed
    "priorityLevel": 3, // the priority level of the task (NormalPriority in this case)
    "startTime": 9367289.099999994, // when the task should start
    "expirationTime": 9372289.099999994, // when the task should be completed by
    "sortIndex": -1 // used for ordering tasks (-1 is default value. it's set later based on timing)
}
```

the `callback` here is the function `performConcurrentWorkOnRoot`. We'll dig into it later when the work is actually performed.

```js

if (startTime > currentTime) {
  // This is a delayed task.
  newTask.sortIndex = startTime;
  push(timerQueue, newTask);

  if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
    // All tasks are delayed, and this is the task with the earliest delay.
    if (isHostTimeoutScheduled) {
      // Cancel an existing timeout.
      cancelHostTimeout();
    } else {
      isHostTimeoutScheduled = true;
    } // Schedule a timeout.

    requestHostTimeout(handleTimeout, startTime - currentTime);
  }
} else {
    ...
}

return newTask;
}
```

since startTime is not > currentTime, we enter the else branch:

```js
    else {
      newTask.sortIndex = expirationTime;
      push(taskQueue, newTask);
      // wait until the next time we yield.


      if (!isHostCallbackScheduled && !isPerformingWork) {
        isHostCallbackScheduled = true;
        requestHostCallback(flushWork);
      }
    }
```

we set `newTask.sortIndex` to the expirationTime. This makes sense because we want to sort tasks by when they expire.

We then push the `newTask` onto the `taskQueue` (currently []). This `taskQueue` is a global variable within scope here.

the push method is interesting:

```js
function push(heap, node) {
  var index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}
```

we see the queue is treated as a heap here, and we perform `siftUp` after inserting the node. If you look at `siftUp`:

```js
function siftUp(heap, node, i) {
  var index = i;

  while (index > 0) {
    var parentIndex = (index - 1) >>> 1;
    var parent = heap[parentIndex];

    if (compare(parent, node) > 0) {
      // The parent is larger. Swap positions.
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      // The parent is smaller. Exit.
      return;
    }
  }
}
```

we "sift" the node up the tree when its parent is larger. this leads the tree to have the smallest node at the top, and the larger nodes at the bottom.

in other words, the task queue is backed by a [ minheap ](https://www.geeksforgeeks.org/introduction-to-min-heap-data-structure/)!

This ensures the queue remains sorted with the smallest value (earliest expiration) at index 0. After inserting the task in the queue, we land here:

```js
if (!isHostCallbackScheduled && !isPerformingWork) {
  isHostCallbackScheduled = true;
  requestHostCallback(flushWork);
}
```

since this is the first unit of work to perform, `isHostCallbackScheduled` and `isPerformingWork` are both false, and so we actually run this branch. We set isHostCallbackScheduled to true, and call `requestHostCallback` with an arg of `flushWork`:

```js
function requestHostCallback(callback) {
  scheduledHostCallback = callback;

  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}
```

we set a global (`scheduledHostCallback`) to the `callback` (`flushWork`).
Since `isMessageLoopRunning` is false, so we set it to true, and call `schedulePerformWorkUntilDeadline`.

```js
schedulePerformWorkUntilDeadline = function () {
  port.postMessage(null);
};
```

we use a port to post a null message. but what is this port, and what does it do with it's messages?

Turns out React uses the [Channel Messaging API](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API).

If we look above this line, we can see why:

```js
// DOM and Worker environments.
// We prefer MessageChannel because of the 4ms setTimeout clamping.
var channel = new MessageChannel();
var port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

schedulePerformWorkUntilDeadline = function () {
  port.postMessage(null);
};
```

The 4ms setTimeout clamping refers to a browser behavior where nested setTimeout calls with delays less than 4ms are automatically clamped to a minimum of 4ms. This was introduced as a performance optimization to prevent excessive CPU usage from rapid timer firing.

Using `MessageChannel` allows sub 4ms handling of the callback. But why not run the function immediately?

Using MessageChannel instead of running the function immediately gives React more control over timing and scheduling. While it could theoretically run the callback right away, posting a message:

1. Makes the callback run asynchronously, allowing the current call stack to clear
2. Gives the browser a chance to handle other high priority work like user input
3. Still executes much faster than setTimeout (which has a 4ms minimum delay)
4. Maintains a consistent async scheduling model across different types of updates

So all of this results in scheduling a call to `performWorkUntilDeadline` (because a message on `port2` triggers the onmessage handler of `port1`).

We'll set a breakpoint on `peformWorkUntilDeadline`, but this wont run immediately since this is called asynchronously. We'll come back to it later. Let's first bubble back up the call stack to `scheduleCallback`, and return the `newTask`.

```js
 if (!isHostCallbackScheduled && !isPerformingWork) {
        isHostCallbackScheduled = true;
        requestHostCallback(flushWork); // (seb) we just returned from here...
      }
    }

    return newTask; // (seb) ... and then return the new task
```

from here we bubble up quite a bit, unrolling the callstack like so:

```js
schedulePerformWorkUntilDeadline();
requestHostCallback(flushWork);
unstable_scheduleCallback();
scheduleCallback();
scheduleCallback$1();
ensureRootIsScheduled(); // We're back here
```

and we end up here

```js
       newCallbackNode = scheduleCallback$1(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root)); // this completed.
    }

    root.callbackPriority = newCallbackPriority;
    root.callbackNode = newCallbackNode;
}
```

the root's `callbackPriority` (16) and `callbackNode` are set, and we return from `ensureRootIsScheduled`.

```js
ensureRootIsScheduled(root, eventTime); // (seb) this just finished

if (
  lane === SyncLane &&
  executionContext === NoContext &&
  (fiber.mode & ConcurrentMode) === NoMode && // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
  !ReactCurrentActQueue$1.isBatchingLegacy
) {
  // Flush the synchronous work now, unless we're already working or inside
  // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
  // scheduleCallbackForFiber to preserve the ability to schedule a callback
  // without immediately flushing it. We only do this for user-initiated
  // updates, to preserve historical behavior of legacy mode.
  resetRenderTimer();
  flushSyncCallbacksOnlyInLegacyMode();
}
```

We know lane is not a sync lane, so we can skip this, and continue to bubble upward into `updateContainer`

```js
    if (root !== null) {
        scheduleUpdateOnFiber(root, current$1, lane, eventTime); // (seb) this just finished
        entangleTransitions(root, current$1, lane);
    }
    return lane;
}
```

we then move into `entangleTransitions`. This function is responsible for managing React's transition state when updates occur. It:

1. Tracks which lanes are part of ongoing transitions
2. Groups related transition updates together
3. Ensures transitions complete atomically (all or nothing)
4. Handles suspense boundaries within transitions

In our case though, since we're not dealing with a transition update (just a regular render), this function doesn't do anything meaningful and returns immediately.

And with that, we return the lane (16), and have finally finished execution of `updateContainer`.

```js
// (seb) in ReactDOMRoot.prototype.render
    updateContainer(children, root, null, null); // (seb) this just returned
  };
```

React.render has officially finished execution. Oh my god. Amazing.

Except our UI is still blank...

As we saw, Render queues the work, and is fully async. The work is staged and ready to be processed, but hasn't been processed yet. This is where our MessageChannel breakpoint gets hit, and we see the work actually get done. If we hit play on the debugger...

## 3. Doing the Work

Bam. Our `performWorkUntilDeadline` breakpoint gets hit. It's time to (actually) render our Like Button component.

```js
var performWorkUntilDeadline = function () {
  if (scheduledHostCallback !== null) {
    var currentTime = getCurrentTime(); // Keep track of the start time so we can measure how long the main thread
    // has been blocked.

    startTime = currentTime;
    var hasTimeRemaining = true; // If a scheduler task throws, exit the current browser task so the
    // error can be observed.
    //
    // Intentionally not using a try-catch, since that makes some debugging
    // techniques harder. Instead, if `scheduledHostCallback` errors, then
    // `hasMoreWork` will remain true, and we'll continue the work loop.

    var hasMoreWork = true;

    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        // If there's more work, schedule the next message event at the end
        // of the preceding one.
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  } // Yielding to the browser will give it a chance to paint, so we can
};
```

`scheduledHostCallback` is not null, so we go into this if branch.

```js
var currentTime = getCurrentTime(); // Keep track of the start time so we can measure how long the main thread
// has been blocked.

startTime = currentTime;
var hasTimeRemaining = true; // If a scheduler task throws, exit the current browser task so the
// error can be observed.
//
// Intentionally not using a try-catch, since that makes some debugging
// techniques harder. Instead, if `scheduledHostCallback` errors, then
// `hasMoreWork` will remain true, and we'll continue the work loop.

var hasMoreWork = true;

try {
  hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
} finally {
  if (hasMoreWork) {
    // If there's more work, schedule the next message event at the end
    // of the preceding one.
    schedulePerformWorkUntilDeadline();
  } else {
    isMessageLoopRunning = false;
    scheduledHostCallback = null;
  }
}
```

we call the scheduledHostCallback with true and the currentTime. This callback is actually a reference to `flushWork`. Let's see it execute.

```js
function flushWork(hasTimeRemaining, initialTime) {
  isHostCallbackScheduled = false;

  if (isHostTimeoutScheduled) {
    // We scheduled a timeout but it's no longer needed. Cancel it.
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  var previousPriorityLevel = currentPriorityLevel;

  try {
    if (enableProfiling) {
      try {
        return workLoop(hasTimeRemaining, initialTime);
      } catch (error) {
        if (currentTask !== null) {
          var currentTime = getCurrentTime();
          markTaskErrored(currentTask, currentTime);
          currentTask.isQueued = false;
        }

        throw error;
      }
    } else {
      // No catch in prod code path.
      return workLoop(hasTimeRemaining, initialTime);
    }
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}
```
