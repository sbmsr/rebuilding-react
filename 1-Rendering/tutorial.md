i'm curious to learn react internals. to start, let's look at some simple react code, and see what happens.

```js
const LikeButton = () => {
  const [likes, setLikes] = React.useState(0);
  return React.createElement(
    'button',
    { onClick: () => setLikes(likes + 1) },
    `Like (${likes})`
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const domContainer = document.querySelector("#root");
  const root = ReactDOM.createRoot(domContainer);
  root.render(React.createElement(LikeButton));
});

```

let's step through and identify what happens at each line, starting from when the DOM is loaded.

# Creating a Dom Container

react needs a spot in the dom to manage. we'll give it an element, and let it do stuff to it.

```js
const domContainer = document.querySelector("#root");
const root = ReactDOM.createRoot(domContainer);
```

ReactDOM.createRoot will give us a ReactDomRoot. What is that exactly? Let's jump in and see what this method does to find out 😊


```js
function createRoot$1(container, options) {
    {
      if (!Internals.usingClientEntryPoint && !true) {
        error('You are importing createRoot from "react-dom" which is not supported. ' + 'You should instead import it from "react-dom/client".');
      }
    }

    return createRoot(container, options);
  }
```

React checks if the consumer is react-dom/client (i'm assuming the Internals.usingClientEntryPoint is set to true when using react-dom/client). if it is, this is the wrong createRoot. Since we're using react-dom, this check will not result in an error, and we'll proceed to calling createRoot.

let's move into the actual createRoot function.

```js
function createRoot(container, options) {
  if (!isValidContainer(container)) {
    throw new Error('createRoot(...): Target container is not a DOM element.');
  }

  warnIfReactDOMContainerInDEV(container);
  var isStrictMode = false;
  var concurrentUpdatesByDefaultOverride = false;
  var identifierPrefix = '';
  var onRecoverableError = defaultOnRecoverableError;
  var transitionCallbacks = null;

  if (options !== null && options !== undefined) {
    {
      if (options.hydrate) {
        warn('hydrate through createRoot is deprecated. Use ReactDOMClient.hydrateRoot(container, <App />) instead.');
      } else {
        if (typeof options === 'object' && options !== null && options.$$typeof === REACT_ELEMENT_TYPE) {
          error('You passed a JSX element to createRoot. You probably meant to ' + 'call root.render instead. ' + 'Example usage:\n\n' + '  let root = createRoot(domContainer);\n' + '  root.render(<App />);');
        }
      }
    }

    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }

    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }

    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }

    if (options.transitionCallbacks !== undefined) {
      transitionCallbacks = options.transitionCallbacks;
    }
  }

```

we do some checks, and then parse & validate the options passed in to createRoot. we then store these flags in local variables. let's continue.

```js

  var root = createContainer(container, ConcurrentRoot, null, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError);
  markContainerAsRoot(root.current, container);
  var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
  listenToAllSupportedEvents(rootContainerElement);
  return new ReactDOMRoot(root);
}
```

it looks like we do a lot here.

1) We create a new container, and assign this value to root.
2) We mark the container as the root of the tree.
3) We take the container and make sure it subscribes to all supported events.
4) we then wrap this root in a ReactDOMRoot

Lets dive into #1 by exploring the new container we created and assigned to Root.

```js
function createContainer(containerInfo, tag, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError, transitionCallbacks) {
    var hydrate = false;
    var initialChildren = null;
    return createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError);
  }
```

looks like we set some flags, and call createFiberRoot, which looks like this:

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

looks like we create a FiberRootNode. what is that?

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

it looks like a constructor for an object. what is interesting about the constructor is it uses scope blocks `{ . . . }` for certain settings. I looked into why these are here, and I believe these block scopes are stripped out in production builds, meaning that anything in them is only set in development environments. 

anyway, lets look at the constructed object:

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

interesting. this FiberRootNode is mostly a zero'd out datastructure. lets go back up and see what createFiberRoot does with this FiberRootNode.

```js
var uninitializedFiber = createHostRootFiber(tag, isStrictMode);
```

we create a HostRootFiber, and set the root.current (formerly null), to the uninitializedFiber. what is this uninitialized fiber?

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

it looks like we do some bitwise OR operations to create some [bitwise flags](https://developer.mozilla.org/en-US/docs/Glossary/Bitwise_flags), and pass those into the createFiber method.


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

this seems to be a foundational data structure. there's a ton of comments about do's and don'ts, so this is likely a hot path in the codebase. you can see theres also some serious consideration about performance, with mentions of V8 optimizations (after googling smis, they are [V8's representation of small ints](https://stackoverflow.com/a/57426773)).

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

we then return up the callstack a bunch. we go up through the createFiber and createHostRootFiber functions, and return to createFiberRoot, with uninitializedFiber set to the above data.

```js
    var uninitializedFiber = createHostRootFiber(tag, isStrictMode);
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;
```

we set root.current to the uninitializedFiber, and also set the Fiber's state node to this root, a bidirectional parent child relationship.

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
```

we have a block scope here that creates a initialState variable, which is then assigned to the memoizedState of the fiber (remember, block scopes like this one only runs in dev mode). 

```js
initializeUpdateQueue(uninitializedFiber);
```

We then call initializeUpdateQueue with the fiber. Let's see what this does.

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

this appears to be an update queue for the fiber. i'd expect this to queue updates, but we'll see if that is the case once we start making updates to the ui.

Anyways, we return from here, and finally(!!!!) return the fiber root (phew... 😮‍💨).

```js
  return root;
}
```

this return bubbles up to `createContainer` and ends up back in `createRoot`.

```js
    var root = createContainer(container, ConcurrentRoot, null, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError); // we just bubbled back up here.
    markContainerAsRoot(root.current, container);
    var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
    listenToAllSupportedEvents(rootContainerElement);
    return new ReactDOMRoot(root);
```

it's been a while, but if you recall, we were doing 4 things at the end of this method:

1) We create a new container, and assign this value to root.
2) We mark the container as the root of the tree.
3) We take the container and make sure it subscribes to all supported events.
4) we then wrap this root in a ReactDOMRoot

We just completed #1 (jeez). Lets step into 2-4.

```js
markContainerAsRoot(root.current, container);
```

lets see what this does.

```js
  function markContainerAsRoot(hostRoot, node) {
    node[internalContainerInstanceKey] = hostRoot;
  }
```

we pass the fiber and the element into this, and add a reference to the fiber associated with this element. we use a [pseudo-randomly-generated](https://github.com/facebook/react/issues/21128#issue-843662904) key `internalInstanceKey` to assign this reference. 

I don't know why its pseudo-random, but if i had to guess, it's because there can be multiple containers on a single web page. 

After doing this we bubble back up and hit the next line.

```js
    var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
```

if this container element is a [comment](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#node.comment_node), we want to define it's parent as the root container element. Otherwise we use the element itself as the root container element.

We've completed #2. let's do #3

~~1) We create a new container, and assign this value to root.~~
~~2) We mark the container as the root of the tree.~~
3) We take the container and make sure it subscribes to all supported events.
4) we then wrap this root in a ReactDOMRoot

```js
listenToAllSupportedEvents(rootContainerElement);
```

lets step in and see what this does.

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

we check if the listening marker boolean has been set on this element. if it has not, we set it to true do a bunch of stuff. i'd bet this boolean denotes if a element has been configured to listen to events.

What is this bunch of stuff? let's take a look.

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

we subscribe the root container element to listen to events. if you look at listenToNativeEvent's implementation, you'll see that the event listener is wrapped in some react logic. after calling `listenToNativeEvent` and `addTrappedEventListener`, we land at the interesting function below...

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

we do a lot here, but most importantly, we create event listener wrappers with priorities. these wrapper lets react track when events happen, and can schedule/prioritize/pause/cancel things as react sees fit.

Going back up the call stack...

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

the second argument to `listenToNativeEvent` is used to designate if the listener should be triggered on the capture phase of event propogation. i didn't know about this, but [events propogate in 3 phases](https://react.dev/learn/responding-to-events#capture-phase-events). From the docs:

1) It travels down, calling all onClickCapture handlers. ("Capture" Phase)
2) It runs the clicked element’s onClick handler. ("Target" phase)
3) It travels upwards, calling all onClick handlers. ("bubbling" phase)

Depending on the event, react sets the root element listener to be called on either the capture or the bubbling phase. The decision of bubbling vs capture phase is made based on whether or not the event is in nonDelegatedEvents set. If it is a nonDelegatedEvent, react sets the container's event listener to be called during the bubbling phase (late, AKA after child handler runs). otherwise, the root element's event listener is called during the capture phase (early, AKA before child handler runs).

What are nonDelegatedEvents? let's take a look and see...

```js
[
    "cancel",
    "close",
    "invalid",
    "load",
    "scroll",
    "toggle",
    "abort",
    "canplay",
    "canplaythrough",
    "durationchange",
    "emptied",
    "encrypted",
    "ended",
    "error",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "pause",
    "play",
    "playing",
    "progress",
    "ratechange",
    "resize",
    "seeked",
    "seeking",
    "stalled",
    "suspend",
    "timeupdate",
    "volumechange",
    "waiting"
]
```

so if the event handler is any of these, we let the children handlers run first. and if the event is, say a click, then the container's handler runs first.

why do this? if i had to guess, it is because react wants to short circuit the handler, and do some of the event handling itself in some optimized way. Here's what chatGPT had to say. 

```md
In React, event delegation is used to optimize performance by attaching a single event listener to the root container instead of attaching individual listeners to every DOM element. This single listener can then handle events for any child elements. However, not all events should behave in the same way when it comes to when and how they are captured or handled. That’s why React differentiates between certain events, allowing some to be delegated and others to run on specific phases of event propagation.
```

Aside: [I made a simple demo here to show how handlers are run based on the bubble/capture phase.](https://gist.github.com/sbmsr/d63271920518bb0a3e67f9f2780a8542).  the tl;dr is that capture events run before bubble events, and to set a listener to run on capture, you pass [true as the third arg](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#syntax) in addEventListener. By looking at the react codebase, you're learning about how the underlying dom handles event listeners 😊

Moving on...

```js
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

react here adds some event listeners to the `<document>` element in the page. with the way it's called, react tracks when the `selectionchange` change event fires on the document (allowing react to handle selection across the whole page). this is helpful if the user selects something between the rootContainerElement and the rest of the page.

with that, we conclude the `listenToAllSupportedEvents` call, and return to the final line of `createRoot` (FINALLY).

~~1) We create a new container, and assign this value to root.~~
~~2) We mark the container as the root of the tree.~~
~~3) We take the container and make sure it subscribes to all supported events.~~
4) we then wrap this root in a ReactDOMRoot

```js
return new ReactDOMRoot(root);
```

Let's see what this constructor does.

```js
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
```
it basically returns an object of the following shape

```js
{
  _internalRoot: // Root node goes here.
}
```

and we've finally wrapped up the 4 root initialization steps.

~~1) We create a new container, and assign this value to root.~~
~~2) We mark the container as the root of the tree.~~
~~3) We take the container and make sure it subscribes to all supported events.~~
~~4) we then wrap this root in a ReactDOMRoot~~


now we move back into our code, and process the next line, which will render our component within the root.

```js
root.render(React.createElement(LikeButton));
```

We first use React.createElement to create a ReactElement from our LikeButton functional component, and then we render this react element inside the root.

Let's see how `React.createElement` works. What's interesting is, when I step into `createElement`, i am sent to an alias called `createElementWithValidation`:

```js
function createElementWithValidation(type, props, children) {
    var validType = isValidElementType(type); // We warn in this case but don't throw. We expect the element creation to
    // succeed and there will likely be errors in render.

    if (!validType) {
      var info = '';

      if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
        info += ' You likely forgot to export your component from the file ' + "it's defined in, or you might have mixed up default and named imports.";
      }

      var sourceInfo = getSourceInfoErrorAddendumForProps(props);

      if (sourceInfo) {
        info += sourceInfo;
      } else {
        info += getDeclarationErrorAddendum();
      }

      var typeString;

      if (type === null) {
        typeString = 'null';
      } else if (isArray(type)) {
        typeString = 'array';
      } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
        typeString = "<" + (getComponentNameFromType(type.type) || 'Unknown') + " />";
        info = ' Did you accidentally export a JSX literal instead of a component?';
      } else {
        typeString = typeof type;
      }

      {
        error('React.createElement: type is invalid -- expected a string (for ' + 'built-in components) or a class/function (for composite ' + 'components) but got: %s.%s', typeString, info);
      }
    }
```

the first bit of this method is some element type validation. valid types (specified in `isValidElementType` ) include functions, strings, Symbol(react.fragment), and more. Since our LikeButton is a function, we are good here, and validType will be `true`. Moving on...

```js
    var element = createElement.apply(this, arguments); // The result can be nullish if a mock or a custom function is used.
    // TODO: Drop this when these are no longer allowed as the type argument.

    if (element == null) {
      return element;
    } // Skip key warning if the type isn't valid since our key validation logic
    // doesn't expect a non-string/function type and can throw confusing errors.
    // We don't want exception behavior to differ between dev and prod.
    // (Rendering will throw with a helpful message and as soon as the type is
    // fixed, the key warnings will appear.)


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

we create an element by passing the [arguments](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments) array into `createElement.` 

in our current example, arguments looks like:

```js
[
  () => {
    const [likes, setLikes] = React.useState(0);
    return React.createElement(
      'button',
      { onClick: () => setLikes(likes + 1) },
      `Like (${likes})`
    );
  }
]
```

So we are essentially passing our functional component into `createElement`. Lets dive in and see what happens.

```js
function createElement(type, config, children) {
    var propName; // Reserved names are extracted

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

        key = '' + config.key;
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
        var displayName = typeof type === 'function' ? type.displayName || type.name || 'Unknown' : type;

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

This function is massive. 

broken down, we first parse a config. Since our component doesn't have any custom config, we can ignore that. We then do some work to figure out the children of our element here.

```js
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

`childrenLength` is -1, so we skip this and jump to this block.

```js
    if (type && type.defaultProps) {
      var defaultProps = type.defaultProps;

      for (propName in defaultProps) {
        if (props[propName] === undefined) {
          props[propName] = defaultProps[propName];
        }
      }
    }
```

since our element is a functional component without default props, we skip this too and end up here.

```js
    {
      if (key || ref) {
        var displayName = typeof type === 'function' ? type.displayName || type.name || 'Unknown' : type;

        if (key) {
          defineKeyPropWarningGetter(props, displayName);
        }

        if (ref) {
          defineRefPropWarningGetter(props, displayName);
        }
      }
    }
```

Our element doesn't have a key or ref, so we also skip this, and construct a ReactElement.

```js
return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
```

Now we create a `ReactElement`. Let's dive in.

```js
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
    _owner: owner
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

    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false
    }); // self and source are DEV only properties.

    Object.defineProperty(element, '_self', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: self
    }); // Two elements created in two different places should be considered
    // equal for testing purposes and therefore we hide it from enumeration.

    Object.defineProperty(element, '_source', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: source
    });

    if (Object.freeze) {
      Object.freeze(element.props);
      Object.freeze(element);
    }
  }

  return element;
};
```

We construct a ReactElement, and [freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) its props + the element itself. This prevents bugs at the cost of freedom. 

now that we have created our element, let's bubble back up to `React.createElementWithValidation`, where we do a null check against the element we just created. 

```js
  var element = createElement.apply(this, arguments); // The result can be nullish if a mock or a custom function is used.

  if (element == null) {
    return element;
  }
```

The comment above the check explains why - the element can be nullish if a mock or a custom function is used. if the result is nullish, we return early. This is not the case here, so we resume.

```js
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

We take any children (they're apparently in the arguments array), and perform validation on them, before returning the element. 

how the children are passed in the arguments is beyond me. As an aside, lets try and see if we can make multiple children show up here in the args.




DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBTDDDDDDDDDDDDDDDDDDDDDDD
