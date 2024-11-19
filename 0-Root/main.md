# Article 1

The entrypoint to every react component tree is a div like this one:

```html
<body>
    <div id="root"></div>
</body>
```

We "inject react" into it by doing the following:

```js
document.addEventListener('DOMContentLoaded', () => {
  const domContainer = document.querySelector("#root");
  const root = ReactDOM.createRoot(domContainer);
  root.render(React.createElement(LikeButton));
});
```

in this section we will dive into the rabbit hole that is this deceptively simple line.

```js
const root = ReactDOM.createRoot(domContainer);
```

By stepping in, we reach the underlying createRoot implementation:

```js
function createRoot(container, options) {
  // ...i've omitted lots of parsing/validation of the options arg.
  // We store these options in local variables, and reach the meat of the function below...
  var root = createContainer(container, ConcurrentRoot, null, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError);
  markContainerAsRoot(root.current, container);
  var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
  listenToAllSupportedEvents(rootContainerElement);
  return new ReactDOMRoot(root);
}
```

it looks like we do a lot here.

```js
  var root = createContainer(...);
```
1) We create a new container.

```js
  markContainerAsRoot(...);
```

2) We mark the container as the root of the tree.

```js
  var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
```

3) if the container is a comment node, we use it's parent as the "root container".

```js
  listenToAllSupportedEvents(rootContainerElement);
```

4) We take the container and make sure it subscribes to all supported events.

```js
return new ReactDOMRoot(root);
```

5) we then wrap this root in a ReactDOMRoot

## createRoot: 1. Creating a new "Container"

What the hell is this container, and why do we make it?

```js
function createContainer(containerInfo, tag, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError, transitionCallbacks) {
    var hydrate = false;
    var initialChildren = null;
    return createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError);
  }
```

Aha! This container is a variant of a React Fiber (this one is a "fiber root", specifically). At its core, a Fiber is just a JavaScript object that represents a piece of work to do, or some actual DOM element. In this case, this is a DOM Element (our root `<div>` element). We'll see how Fibers/Fiber Roots are implemented real soon...

<details>
  <summary>
    React Fiber is the core datastructure used in React's "reconciliation" algorithm introduced in React 16. Click here to learn more about it
  </summary>

  React Fibers were a complete rewrite of React's internal architecture, designed to solve several key problems:

   1. **Incremental Rendering**: The ability to split rendering work into chunks and spread it out over multiple frames.

   2. **Prioritization**: The ability to prioritize different types of updates - for example, animations need to complete more quickly than data updates.

   3. **Pause and Resume**: The ability to pause work and come back to it later.

   4. **Abort**: The ability to abandon work if it's no longer needed.
</details>

<details>
  <summary>
    Reconciliation is React's process of determining what changes need to be made to the DOM. Click here to learn more about it
  </summary>

  Reconciliation is React's process of determining what changes need to be made to the DOM to match the latest UI state. Here's how it works:

   1. **Virtual DOM Comparison**: When a component's state or props change, React creates a new Virtual DOM tree and compares it with the previous one.

   2. **Diffing Rules**: React uses several assumptions to make this process efficient:
   - Different element types will produce different trees
   - Elements with stable keys will stay the same across renders
   - Elements with different keys are treated as different elements

   3. **Batched Updates**: React batches multiple changes together and processes them in a single pass to improve performance.

   4. **Priority-based Updates**: With Fiber (React 16+), reconciliation became interruptible and priority-based. This means:
   - High-priority updates (like animations) can interrupt low-priority ones
   - Work can be split into chunks and spread across multiple frames
   - Updates can be paused, aborted, or restarted
</details>

```js
  function createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, 
  // TODO: We have several of these arguments that are conceptually part of the
  // host config, but because they are passed in at runtime, we have to thread
  // them through the root constructor. Perhaps we should put them all into a
  // single type, like a DynamicHostConfig that is defined by the renderer.
  identifierPrefix, onRecoverableError, transitionCallbacks) {
    var root = new FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onRecoverableError);
    // stateNode is any.
    // ...
```

looks like we create a FiberRootNode, which looks like this:

```js
function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onRecoverableError) {
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.pendingChildren = null;
    this.current = null;
    this.pingCache = null;
    this.finishedWork = null;
    this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;
    this.callbackNode = null;
    this.callbackPriority = NoLane;
    this.eventTimes = createLaneMap(NoLanes);
    this.expirationTimes = createLaneMap(NoTimestamp);
    this.pendingLanes = NoLanes;
    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.expiredLanes = NoLanes;
    this.mutableReadLanes = NoLanes;
    this.finishedLanes = NoLanes;
    this.entangledLanes = NoLanes;
    this.entanglements = createLaneMap(NoLanes);
    this.identifierPrefix = identifierPrefix;
    this.onRecoverableError = onRecoverableError;

    {
      this.mutableSourceEagerHydrationData = null;
    }

    {
      this.effectDuration = 0;
      this.passiveEffectDuration = 0;
    }

    {
      this.memoizedUpdaters = new Set();
      var pendingUpdatersLaneMap = this.pendingUpdatersLaneMap = [];

      for (var _i = 0; _i < TotalLanes; _i++) {
        pendingUpdatersLaneMap.push(new Set());
      }
    }

    {
      switch (tag) {
        case ConcurrentRoot:
          this._debugRootType = hydrate ? 'hydrateRoot()' : 'createRoot()';
          break;

        case LegacyRoot:
          this._debugRootType = hydrate ? 'hydrate()' : 'render()';
          break;
      }
    }
  }
```

Interestingly enough, theres a lot of scope blocks `{ . . . }` for certain parts of the state. I looked into why these are here, and I believe these block scopes are stripped out in production builds, meaning that anything in them is only ran in non-prod builds.

anyway, lets look at the constructed FiberRoot:

```js
{
    "tag": 1,
    "containerInfo": {},
    "pendingChildren": null,
    "current": null,
    "pingCache": null,
    "finishedWork": null,
    "timeoutHandle": -1,
    "context": null,
    "pendingContext": null,
    "callbackNode": null,
    "callbackPriority": 0,
    "eventTimes": [
        0,
        // a bunch of zeroes ...
    ],
    "expirationTimes": [
        -1,
        // a bunch of -1s...
    ],
    "pendingLanes": 0,
    "suspendedLanes": 0,
    "pingedLanes": 0,
    "expiredLanes": 0,
    "mutableReadLanes": 0,
    "finishedLanes": 0,
    "entangledLanes": 0,
    "entanglements": [
        0,
        // a bunch of zeroes ...
    ],
    "identifierPrefix": "",
    "mutableSourceEagerHydrationData": null,
    "effectDuration": 0,
    "passiveEffectDuration": 0,
    "memoizedUpdaters": {},
    "pendingUpdatersLaneMap": [
        {},
        // a bunch of {}s ...
    ],
    "_debugRootType": "createRoot()"
}
```

This FiberRootNode is mostly a zero'd out datastructure. Lets bubble back up and see how this freshly initialized FiberRootNode is used.

```js
  var uninitializedFiber = createHostRootFiber(tag, isStrictMode);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;
```

We create a host root Fiber (`uninitializedFiber`) through `createHostRootFiber` and create a bidirectional relationship between it and our FiberRootNode.

Lets take a peek at the host root fiber's constructor.

```js
function createHostRootFiber(tag, isStrictMode, concurrentUpdatesByDefaultOverride) {
  var mode;

  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode;

    if (isStrictMode === true) {
      mode |= StrictLegacyMode;

      {
        mode |= StrictEffectsMode;
      }
    }
  } else {
    mode = NoMode;
  }

  if ( isDevToolsPresent) {
    // Always collect profile timings when DevTools are present.
    // This enables DevTools to start capturing timing at any point–
    // Without some nodes in the tree having empty base times.
    mode |= ProfileMode;
  }

  return createFiber(HostRoot, null, null, mode);
}
```

We start by checking the `tag` variable passed in (`tag` is `1`). After doing a quick search of the codebase, I see that `ConcurrentRoot` is `1`.

```js
  var LegacyRoot = 0;
  var ConcurrentRoot = 1;
```

<details>
  <summary>So what's the difference between a LegacyRoot and a ConcurrentRoot?</summary>


  A LegacyRoot (tag = 0) represents the old synchronous rendering mode in React. In this mode:
  - Updates are processed synchronously and can't be interrupted
  - Once React starts rendering, it must complete the entire tree
  - Long updates can block the main thread and cause UI jank

  A ConcurrentRoot (tag = 1) enables React's concurrent rendering features:
  - Updates can be interrupted, paused, and resumed
  - React can work on multiple versions of the UI at the same time
  - High priority updates (like animations) can interrupt lower priority work
  - The main thread remains responsive during long updates
  - Rendering work can be split across multiple frames

  The mode flags we set above (ConcurrentMode, StrictLegacyMode, etc) configure how the root will behave. Setting ConcurrentMode enables all the concurrent features, while NoMode used for legacy roots keeps things synchronous.

</details>

since they match, we step into the `if` block, and perform some bitwise OR operations to create some [bitwise flags](https://developer.mozilla.org/en-US/docs/Glossary/Bitwise_flags), along with the HostRoot flag found higher up in the file:
```js  
var HostRoot = 3; // Root of a host tree. Could be nested inside another node.
```

...Which we pass into the createFiber method:

```js
var createFiber = function (tag, pendingProps, key, mode) {
  // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, pendingProps, key, mode);
};
```

this creates a new FiberNode, lets see what that looks like...

```js
function FiberNode(tag, pendingProps, key, mode) {
    // Instance
    this.tag = tag;
    this.key = key;
    this.elementType = null;
    this.type = null;
    this.stateNode = null; // Fiber

    this.return = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;
    this.ref = null;
    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;
    this.dependencies = null;
    this.mode = mode; // Effects

    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;
    this.lanes = NoLanes;
    this.childLanes = NoLanes;
    this.alternate = null;

    {
      // Note: The following is done to avoid a v8 performance cliff.
      //
      // Initializing the fields below to smis and later updating them with
      // double values will cause Fibers to end up having separate shapes.
      // This behavior/bug has something to do with Object.preventExtension().
      // Fortunately this only impacts DEV builds.
      // Unfortunately it makes React unusably slow for some applications.
      // To work around this, initialize the fields below with doubles.
      //
      // Learn more about this here:
      // https://github.com/facebook/react/issues/14365
      // https://bugs.chromium.org/p/v8/issues/detail?id=8538
      this.actualDuration = Number.NaN;
      this.actualStartTime = Number.NaN;
      this.selfBaseDuration = Number.NaN;
      this.treeBaseDuration = Number.NaN; // It's okay to replace the initial doubles with smis after initialization.
      // This won't trigger the performance cliff mentioned above,
      // and it simplifies other profiler code (including DevTools).

      this.actualDuration = 0;
      this.actualStartTime = -1;
      this.selfBaseDuration = 0;
      this.treeBaseDuration = 0;
    }

    {
      // This isn't directly used but is handy for debugging internals:
      this._debugSource = null;
      this._debugOwner = null;
      this._debugNeedsRemount = false;
      this._debugHookTypes = null;

      if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
        Object.preventExtensions(this);
      }
    }
  } // This is a constructor function, rather than a POJO constructor, still
  // please ensure we do the following:
  // 1) Nobody should add any instance methods on this. Instance methods can be
  //    more difficult to predict when they get optimized and they are almost
  //    never inlined properly in static compilers.
  // 2) Nobody should rely on `instanceof Fiber` for type testing. We should
  //    always know when it is a fiber.
  // 3) We might want to experiment with using numeric keys since they are easier
  //    to optimize in a non-JIT environment.
  // 4) We can easily go from a constructor to a createFiber object literal if that
  //    is faster.
  // 5) It should be easy to port this to a C struct and keep a C implementation
  //    compatible.
```

This is a Fiber, one of React's foundational data structures. There's a ton of comments about do's and don'ts, so this must be a hot path in the codebase. You can see theres also some serious consideration about performance, with mentions of V8 optimizations (SMIs are [V8's representation of small ints](https://stackoverflow.com/a/57426773)).

this constructor spits out the following data:

```js
{
    "tag": 3,
    "key": null,
    "elementType": null,
    "type": null,
    "stateNode": null,
    "return": null,
    "child": null,
    "sibling": null,
    "index": 0,
    "ref": null,
    "pendingProps": null,
    "memoizedProps": null,
    "updateQueue": null,
    "memoizedState": null,
    "dependencies": null,
    "mode": 1,
    "flags": 0,
    "subtreeFlags": 0,
    "deletions": null,
    "lanes": 0,
    "childLanes": 0,
    "alternate": null,
    "actualDuration": 0,
    "actualStartTime": -1,
    "selfBaseDuration": 0,
    "treeBaseDuration": 0,
    "_debugSource": null,
    "_debugOwner": null,
    "_debugNeedsRemount": false,
    "_debugHookTypes": null
}
```

And with that, we have our Host Root Fiber. 

<details>
  <summary>What's the difference between a Host Root Fiber and a Fiber Root Node?</summary>
  The Host Root Fiber is the first Fiber node in the component tree and serves as the parent for all other components that will be rendered. 
  
  The FiberRootNode, on the other hand, handles scheduling, keeps track of pending updates, manages callbacks, and maintains other metadata needed for React's reconciliation process.
</details>

We then return up the callstack back to createFiberRoot:

```js
    var uninitializedFiber = createHostRootFiber(tag, isStrictMode);
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;
```

After linking these two, we build an `initialState`, and set the Host Root Fiber's memoizedState property to it.

```js
    {
      var _initialState = {
        element: initialChildren,
        isDehydrated: hydrate,
        cache: null,
        // not enabled yet
        transitions: null,
        pendingSuspenseBoundaries: null
      };
      uninitializedFiber.memoizedState = _initialState;
    }

    initializeUpdateQueue(uninitializedFiber);
    return root;
```

We then call initializeUpdateQueue with the Host Root Fiber. Let's see what this does.

```js
function initializeUpdateQueue(fiber) {
  var queue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null,
      interleaved: null,
      lanes: NoLanes
    },
    effects: null
  };
  fiber.updateQueue = queue;
}
```

We set the updateQueue prop of the Host Root Fiber to a (mostly) empty update queue object. I expect this to queue updates, but we'll see if that is the case once we start updating the ui...

Anyways, we return from here, and finally(!!!!) return the fiber root (phew... 😮‍💨).

```js
  return root;
}
```

## createRoot: 2. Marking the "Container" as Root

Now that we have a Fiber Root Node (`var root`), it's Host Root Fiber (`root.current`), and the root `<div>` element (`var container`) we mark the Host Root Fiber as the root Fiber. 

```js
markContainerAsRoot(root.current, container);
```

Let's see what this does.

```js
  function markContainerAsRoot(hostRoot, node) {
    node[internalContainerInstanceKey] = hostRoot;
  }
```

On the `<div>` element, we set a [pseudo-randomly-generated](https://github.com/facebook/react/issues/21128#issue-843662904) key `internalInstanceKey` to the Host Root Fiber.

This key is generated once when React initializes and looks like `__reactContainer$p1f9sydgof`. This approach ensures the key is:

1. Unique enough to avoid collisions with other libraries
2. Different across page loads to discourage relying on these internals

After doing this we bubble back up and hit the next line.

## createRoot: 3. Comment Node? Let's look at the Parent...

```js
    var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
```

if this container element is a [comment](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#node.comment_node), we want to define it's parent as the "root". Otherwise we use the element itself as the "root".

<details>
  <summary>Why would React support creating roots from comment nodes?</summary>

  It seems like we can pass a comment element to React, and it will know how to handle mounting a component beside it. Possible use cases for this include:

  1. Server-side rendering (SSR) hydration, where comment nodes can mark sections of pre-rendered HTML that need to be hydrated
  2. Gradual React adoption in legacy apps, using comments as mounting points without modifying existing DOM structure
  3. Multiple independent React roots on a page, using comments as lightweight mounting markers
  4. Avoiding wrapper divs that could interfere with CSS layouts
</details>

## createRoot: 4. Subscribe, Subscribe, Subscribe

```js
listenToAllSupportedEvents(rootContainerElement);
```

`rootContainerElement` is the dom element (`<div>`) with a prop (`__reactContainer$...`) that points to the Host Root Fiber. Lets step in and see how we make the dom element listen to events...

```js
function listenToAllSupportedEvents(rootContainerElement) {
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true;
    allNativeEvents.forEach(function (domEventName) {
      // We handle selectionchange separately because it
      // doesn't bubble and needs to be on the document.
      if (domEventName !== 'selectionchange') {
        if (!nonDelegatedEvents.has(domEventName)) {
          listenToNativeEvent(domEventName, false, rootContainerElement);
        }

        listenToNativeEvent(domEventName, true, rootContainerElement);
      }
    });
    var ownerDocument = rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument;

    if (ownerDocument !== null) {
      // The selectionchange event also needs deduplication
      // but it is attached to the document.
      if (!ownerDocument[listeningMarker]) {
        ownerDocument[listeningMarker] = true;
        listenToNativeEvent('selectionchange', false, ownerDocument);
      }
    }
  }
}
```

We check if the `listeningMarker` (a pseudo-random key that looks like `_reactListeningof1ybkw705s`) has been set on this element. If it has not been set, we set it to true and get to work subscribing this `<div>` to a ton of events:

```js
allNativeEvents.forEach(function (domEventName) {
  // We handle selectionchange separately because it
  // doesn't bubble and needs to be on the document.
  if (domEventName !== 'selectionchange') {
    if (!nonDelegatedEvents.has(domEventName)) {
      listenToNativeEvent(domEventName, false, rootContainerElement);
    }

    listenToNativeEvent(domEventName, true, rootContainerElement);
  }
});
```

Before we disect this further, lets see what the second arg to `listenToNativeEvent` is...

```js
 function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
    {
      if (nonDelegatedEvents.has(domEventName) && !isCapturePhaseListener) {
        error('Did not expect a listenToNativeEvent() call for "%s" in the bubble phase. ' + 'This is a bug in React. Please file an issue.', domEventName);
      }
    }

    var eventSystemFlags = 0;

    if (isCapturePhaseListener) {
      eventSystemFlags |= IS_CAPTURE_PHASE;
    }

    addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener);
  }
```

This arg signals if the event is listened to on the capture phase. Lets step once more in, to see whats happening here.

```js
function addTrappedEventListener(targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener, isDeferredListenerForLegacyFBSupport) {
    var listener = createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags); // If passive option is not supported, then the event will be
    // active and not passive.

    var isPassiveListener = undefined;

    if (passiveBrowserEventsSupported) {
      // Browsers introduced an intervention, making these events
      // passive by default on document. React doesn't bind them
      // to document anymore, but changing this now would undo
      // the performance wins from the change. So we emulate
      // the existing behavior manually on the roots now.
      // https://github.com/facebook/react/issues/19651
      if (domEventName === 'touchstart' || domEventName === 'touchmove' || domEventName === 'wheel') {
        isPassiveListener = true;
      }
    }

    targetContainer =  targetContainer;
    var unsubscribeListener; // When legacyFBSupport is enabled, it's for when we


    if (isCapturePhaseListener) {
      if (isPassiveListener !== undefined) {
        unsubscribeListener = addEventCaptureListenerWithPassiveFlag(targetContainer, domEventName, listener, isPassiveListener);
      } else {
        unsubscribeListener = addEventCaptureListener(targetContainer, domEventName, listener);
      }
    } else {
      if (isPassiveListener !== undefined) {
        unsubscribeListener = addEventBubbleListenerWithPassiveFlag(targetContainer, domEventName, listener, isPassiveListener);
      } else {
        unsubscribeListener = addEventBubbleListener(targetContainer, domEventName, listener);
      }
    }
  }
```

At the bottom you see we condition on `isCapturePhaseListener`. If it's true, we add a capture listener, otherwise we add a bubble listener.


So if the event is not in the nonDelegatedEvents list, we call `listenToNativeEvent` with `isCapturePhaseListener` as `false`, and then call it again with `isCapturePhaseListener` set to `true`.

In other words, if the event is delegated we subscribe to it twice, once on capture, and once on the target phase. If it is nonDelegated, we subscribe on the capture phase only.

<details>
  <summary>How do events propagate in React?</summary>

  Events in React propagate in 3 phases:

  1) Event travels down, calling all onClickCapture handlers. ("Capture" Phase)
  2) Event runs on the clicked element's onClick handler. ("Target" phase) 
  3) Event travels upwards, calling all onClick handlers. ("bubbling" phase)

  For more details, see [React's documentation on capture phase events](https://react.dev/learn/responding-to-events#capture-phase-events).
</details>


<details>
  <summary>What are delegated vs non-delegated events?</summary>

  React divides DOM events into two categories:

  1. **Delegated Events** (most events like 'click', 'change', etc):
     - These events naturally bubble up through the DOM tree
     - React attaches a single listener at the root container
     - When an event fires on a child element, it bubbles up to the root where React's handler intercepts it
     - This is more efficient than attaching individual listeners to every element
     - Example: A click handler on a button doesn't need its own listener - the root container's listener handles it

  2. **Non-Delegated Events** (like 'scroll', 'focus', 'blur', etc):
     - These events don't bubble or need to be handled directly on the target
     - React attaches listeners directly to the target DOM elements
     - Each element gets its own listener rather than delegating to the root
     - This is necessary because you can't reliably catch these events at a parent level
     - Example: A scroll event on a div needs its own listener since scroll doesn't bubble

  This split allows React to optimize event handling - using delegation where possible for better performance, while still supporting events that require direct attachment.

  For a deeper dive into general event delegation, see [this excellent article on javascript.info](https://javascript.info/event-delegation).
</details>

So it looks like for each event, we track it during the capture phase from the root element. If it is a delegated event, we also track it during the bubbling phase.

Concretely, if the event is a `nonDelegatedEvent` (like `scroll`), React sets the container's event listener to be called during the capture phase (early, before child handlers run). If the event is a delegated event (like `click`), the root element's event listener is called during both the capture phase (early, before child handlers run) AND during the bubbling phase (late, after child handlers run).

<details>
  <summary>What are "child handlers" in this context?</summary>

  When we talk about "child handlers" in this context, we're referring to React component event handlers that are closer to where the event occurred in the DOM tree.

  For example, consider this component hierarchy:
  ```jsx
  <div onClick={parentHandler}>
    <button onClick={childHandler}>Click me!</button>
  </div>
  ```

  Here, `childHandler` is the "child handler" because it's attached to the button where the click actually happens, while `parentHandler` is further up in the tree. During event propagation:
  - In capture phase, `parentHandler` runs first if using onClickCapture
  - At target, `childHandler` runs 
  - In bubble phase, `parentHandler` runs last if using onClick
</details>

<details>
  <summary>Why subscribe to both capture and bubble phases for delegated events?</summary>

  React subscribes to both phases for delegated events (like 'click') for several important reasons:

  1. **Early Intervention**: By listening in the capture phase, React can intercept and handle events before they reach the target component. This allows React to:
     - Set up its synthetic event system
     - Handle event pooling and cleanup
     - Cancel events if needed before they reach components

  2. **Late Cleanup**: By also listening in the bubble phase, React can:
     - Clean up any resources allocated during capture
     - Handle any events that weren't caught during capture
     - Implement event delegation patterns where parent components handle events from children

  3. **Complete Control**: Having listeners in both phases gives React full control over the event lifecycle, enabling optimizations and consistent cross-browser behavior.

  For non-delegated events (like 'scroll'), React only needs capture phase since these events are meant to be handled directly by the target element rather than bubbling up through the tree.
</details>


<details>
  <summary>Why does React use event delegation?</summary>

  In React, event delegation is used to optimize performance by attaching a single event listener to the root container instead of attaching individual listeners to every DOM element. This single listener can then handle events for any child elements. However, not all events should behave in the same way when it comes to when and how they are captured or handled. That's why React differentiates between certain events, allowing some to be delegated and others to run on specific phases of event propagation.

  Aside: [I made a simple demo here to show how handlers are run based on the bubble/capture phase.](https://gist.github.com/sbmsr/d63271920518bb0a3e67f9f2780a8542).  the tl;dr is that capture events run before bubble events, and to set a listener to run on capture, you pass [true as the third arg](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#syntax) in addEventListener. By looking at the react codebase, you're learning about how the underlying dom handles event listeners 😊

</details>


If we look at `addTrappedEventListener(...)`, the first thing we do is call `eventListenerWrapperWithPriority(...)`.

```js
  function createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags) {
    var eventPriority = getEventPriority(domEventName);
    var listenerWrapper;

    switch (eventPriority) {
      case DiscreteEventPriority:
        listenerWrapper = dispatchDiscreteEvent;
        break;

      case ContinuousEventPriority:
        listenerWrapper = dispatchContinuousEvent;
        break;

      case DefaultEventPriority:
      default:
        listenerWrapper = dispatchEvent;
        break;
    }

    return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer);
  }
```

We see that theres a `getEventPriority(...)` function which sets the priorities of each event. Priorities are either `discrete` (like `clicking`), `continuous` (like `scrolling`), or `default` (like `pointerenter`). 

These priorities will be used during reconciliation to schedule high priority changes earlier than lower priority ones.

That covers how allNativeEvents are listened to by the root `<div>` element. Going back up the call stack...

```js
  allNativeEvents.forEach(function (domEventName) {
    // We handle selectionchange separately because it
    // doesn't bubble and needs to be on the document.
    if (domEventName !== 'selectionchange') {
      if (!nonDelegatedEvents.has(domEventName)) {
        listenToNativeEvent(domEventName, false, rootContainerElement);
      }

      listenToNativeEvent(domEventName, true, rootContainerElement);
    }
  });

  var ownerDocument = rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument;

  if (ownerDocument !== null) {
    // The selectionchange event also needs deduplication
    // but it is attached to the document.
    if (!ownerDocument[listeningMarker]) {
      ownerDocument[listeningMarker] = true;
      listenToNativeEvent('selectionchange', false, ownerDocument);
    }
  }
```

It appears we add a `selectionchange` event listener to the `<document>` element in the page. This allows react to handle selection across the whole page, which is helpful if the user selects something between the root element and the rest of the page.

And with that, we conclude the `listenToAllSupportedEvents` call, and return to the final line of `createRoot` (FINALLY).

## createRoot: 5. Wrap it all up (in a reactdomroot)

```js
return new ReactDOMRoot(root);
```

Let's see what this constructor does.

```js
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
```

we set the `_internalRoot` property of `ReactDOMRoot` to the `FiberRootNode`.

and with that, we've finally wrapped up the root initialization process.


# Summary + Architecture Implications

Let's summarize what we learned about React's root initialization process:

1. **Container Preparation**: React takes a DOM element and marks it as a React container using a unique key. This ensures React can track which elements it controls.

2. **Root Creation**: A FiberRootNode is created as the top-level data structure that will manage the entire React tree.

3. **Event System Setup**: React sets up a comprehensive event delegation system by:
   - Adding event listeners to the root container for most events
   - Adding special event listeners (like selectionchange) to the document
   - Using a marker to prevent duplicate event listener registration

4. **Root Encapsulation**: Finally, the FiberRootNode is wrapped in a ReactDOMRoot object.

This architecture enables React to:
- Efficiently handle events through delegation
- Support multiple independent React roots on a page
- Maintain clear boundaries between React and non-React code
