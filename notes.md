# React Internals Deep Dive

## What concepts do I want to understand better?

- Rendering

  - how does it actually work? What does the render lifecycle look like?
    - How is the Dom manipulated during the render stage? does react simply run js functions on extant dom nodes? or are nodes swapped entirely?
  - What is a v-dom? How can I implement one? Should I?
    - What is reconciliation? (i think its the process of reconciling the dom with the v-dom?)
      - How does it work?
      - What data structures are involved here? i imagine trees would make a lot of sense here.
      - \*\*
        - Optimizing Reconciliation
          - Discuss how to write code that helps React minimize reconciliation work.
          - Introduce concepts like shouldComponentUpdate and React.memo.
  - what triggers a re-render? (i think new args passed to a component, component changing itself, and hooks updating)

- Components

  - What exactly are components? (I believe they're functions that return some (potentially stateful) UI)
  - How do hooks work? (i believe they're closures (have their own variables) and are linked to their consumers in a way that can trigger a component re-render)
    - why do we need a dependency array?
      - how does a dependency array work? (does it cache the result for a set of deps, and return it? is it a performance thing? why do we need it?)
  - why must each component in a list have a key? (i suspect it's to determine which exact component needs to be re-rendered in a list(or map?) of components)

- State

  - how does state work?
  - why is state so painful in react?
  - how does the context api work under the hood?
    - \*\*
      - How Context Works
        - Dive into how React provides and consumes context.
        - Explain how context updates propagate through the component tree.
      - Performance Considerations
        - Discuss potential performance pitfalls with context.
        - Explore techniques to optimize context usage.

- JSX
  - how does JSX work?
  - what does it afford you? why was it built?
  - \*\*
    - JSX Compilation
      - Describe how JSX is transformed into JavaScript.
      - Explain the role of Babel in transpiling JSX.
    - Element Creation
      - Dive into React.createElement and how elements are represented internally.
    - Virtual DOM Elements
      - Discuss the structure of virtual DOM elements and their properties.

- RSC

  - how does RSC work? is there a compiler or something? There must be right?
    - could we write a RSC by hand? what does that look like?
  - What is Hydration? How does it work?


### Chat GPT Suggested Topics

- Fibers

  - incremental rendering
  - concurrency / scheduling

- Concurrent Mode & Scheduling

  - Time-Slicing and Interruptible Rendering
  - Suspense and Data Fetching

- Error Boundaries

  - componentDidCatch
  - limitations

- perf optimization

  - useMemo, useCallback
  - lazy loading components (React.lazy and Suspense for code splitting)

- Portals and Fragments

- Strict Mode

## Potential Second Order Effects of Learning this Stuff

- Best practices(?)
  - would learning react internals help me establish some best practices? (i suspect that knowing how something works helps you work with it more efficiently)
- Understand what problems react solves, and what problems it doesn't (state mgmt is clearly one of them)
- being able to digest a complex system + work with a legacy codebase is always a good skill.
- gain an appreciation for these frameworks, and how they're built
- React is a system for applying changes to a data structure (dom) in a repeatable and stable manner. learning how this works could help me build such a system for state management, which is another one of my recurse goals.

## Related "Articles"

- https://pomb.us/build-your-own-react/
- https://www.youtube.com/watch?v=eTcyOCd6v1c

# Theoretical Table of Contents

... TBD

# vocabulary

- flush
- fiber
- reconciliation
- concurrent mode
