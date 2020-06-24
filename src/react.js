//
// vnode representation
//
const createElement = (type, props = null, ...children) => ({
  type,
  props,
  children: [].concat(...children) || null,
});

const h = createElement;

const getComponentProps = (vnode) => ({
  ...(vnode.type.defaultProps || {}),
  ...vnode.props,
  children: vnode.children || props.children,
});

//
// types
//
const isEmptyNode = (vnode) => vnode == null || typeof vnode === 'boolean';

const isTextNode = (vnode) => typeof vnode === 'string' || typeof vnode === 'number';

const isLiteralNode = (vnode) => isTextNode(vnode) || isEmptyNode(vnode);

const isHtmlNode = (vnode) => vnode && typeof vnode.type === 'string';

const isFragmentNode = (vnode) => Array.isArray(vnode);

//const isComponentNode = (vnode) => vnode && Component.isPrototypeOf(vnode.type);

const isFunctionalComponentNode = (vnode) => vnode && typeof vnode.type === 'function';

const isValidElement = (vnode) =>
  isEmptyNode(vnode) ||
  isTextNode(vnode) ||
  isHtmlNode(vnode) ||
  isFragmentNode(vnode) ||
  isFunctionalComponentNode(vnode);

//
// helpers
//
const toArray = (x) => Array.isArray(x) ? x : (x ? [x] : []);

const isEventListener = (key) => key.startsWith('on');

const getListenerName = (key) => key.slice(2).toLowerCase();

const setElementProp = (el, key, value) => {
  if (isEventListener(key)) {
    el.addEventListener(getListenerName(key), value);
  } else {
    el.setAttribute(key, value);
  }
};

const removeElementProp = (el, key, value) => {
  if (isEventListener(key)) {
    el.removeEventListener(getListenerName(key), value);
  } else {
    el.removeAttribute(key);
  }
};

const updateElementProps = (el, nextProps, prevProps) => {
  // remove old props
  prevProps = prevProps || {};
  Object.keys(prevProps).forEach((key) => {
    if (!nextProps.hasOwnProperty(key)) {
      removeElementProp(el, key, prevProps[key]);
    }
  });

  // update new props
  nextProps = nextProps || {};
  Object.keys(nextProps).forEach((key) => {
    if (
      (!prevProps.hasOwnProperty(key) || prevProps[key] !== nextProps[key]) &&
      key !== 'key' &&
      key !== 'ref'
    ) {
      if (isEventListener(key) && prevProps.hasOwnProperty(key)) {
        removeElementProp(el, key, prevProps[key]);
      }
      setElementProp(el, key, nextProps[key]);
    }
  });
};

const bindListeners = (el, listeners = {}, options = false) => {
  Object.keys(listeners).forEach((key) =>
    el.addEventListener(key, listeners[key], options)
  );

  return () => {
    Object.keys(listeners).forEach((key) =>
      el.removeEventListener(key, listeners[key], options)
    );
  };
};

//
// expandTree: (vnode) -> expanded vnode tree
//
const expandTree = (vnode) => {
  if (typeof vnode === "function") {
    vnode = vnode();
  }

  if (isEmptyNode(vnode)) {
    return vnode;
  }

  if (isTextNode(vnode)) {
    return vnode;
  }

  if (isFragmentNode(vnode)) {
    return vnode.map((child) => expandTree(child));
  }

  if (isFunctionalComponentNode(vnode)) {
    return expandTree(vnode.type(getComponentProps(vnode)));
  }

  return {
    ...vnode,
    children: toArray(vnode.children).map((child) => expandTree(child))
  };
}

//
// renderElement: (vnode) -> expands vnode and returns an HTMLElement tree
//
const backRef = (el, vnode) => {
  el.__vnode = vnode;
  vnode.__ref = el;
  return el;
};

const renderElement = (vnode) => {
  if (typeof vnode === "function") {
    vnode = vnode();
  }

  // null and booleans are just comments
  if (isEmptyNode(vnode)) {
    return backRef(document.createComment(`(${vnode})`), vnode);
  }

  // strings just convert to #text nodes
  if (isTextNode(vnode)) {
    return backRef(document.createTextNode(vnode), vnode);
  }

  // fragments are not real elements in the dom
  if (isFragmentNode(vnode)) {
    const fragment = document.createDocumentFragment();
    vnode.forEach((e) => fragment.appendChild(renderElement(e)));
    vnode.ref = fragment;
    return backRef(fragment, vnode);
  }

  if (isFunctionalComponentNode(vnode)) {
    return renderElement(vnode.type(getComponentProps(vnode)));
  }

  // create a DOM element with the nodeName of our VDOM element:
  const el = backRef(document.createElement(vnode.type), vnode);

  // copy attributes onto the new node:
  updateElementProps(el, vnode.props);

  // render children
  toArray(vnode.children).forEach((child) => el.appendChild(renderElement(child)));

  return el;
}

//
// renderString: (vnode) -> expands vnode and returns an html string
//
const renderString = (vnode) => {
  if (typeof vnode === "function") {
    vnode = vnode();
  }

  if (isEmptyNode(vnode)) {
    return "";
  }

  if (isTextNode(vnode)) {
    return vnode;
  }

  if (isFragmentNode(vnode)) {
    return vnode.map((e) => render(e, renderString)).join('\n');
  }

  if (isFunctionalComponentNode(vnode)) {
    return renderString(vnode.type(getComponentProps(vnode)));
  }

  const props = Object.keys(vnode.props || {})
    .filter((key) => !isEventListener(key))
    .map((key) => `${key}="${vnode.props[key]}"`)
    .join(' ');

  const children = vnode.children
    .map((child) => renderString(child))
    .join('\n');

  if (props) {
    return `<${vnode.type} ${props}>${children}</${vnode.type}>`;
  }

  return `<${vnode.type}>${children}</${vnode.type}>`;
}

//
// render: renders vnode into the DOM container
//
function render(vnode, container) {
  container.innerHTML = "";
  backRef(container, vnode).appendChild(renderElement(vnode));
}

//
// update: updates a rendered DOM node
//
const computeKey = (vnode, i) => {
  if (vnode && vnode.props && vnode.props.key) {
    return vnode.props.key;
  }

  const key =
    vnode && vnode.type ? vnode.type.name || vnode.type : typeof vnode;

  return `__react__.${key}-${i}`;
};

const computeChildKeyMap = (arr) =>
  arr.reduce(
    (memo, child, i) => ((memo[computeKey(child, i)] = child), memo),
    {}
  );

const shallowEqual = (objA, objB) => {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (!objB.hasOwnProperty(keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
      return false;
    }
  }

  return true;
};

const shouldNodeUpdate = (nextVNode, prevVNode) => {
  if (isLiteralNode(prevVNode)) {
    return prevVNode !== nextVNode;
  }

  return (
    nextVNode.type !== prevVNode.type ||
    !shallowEqual(nextVNode.props, prevVNode.props) ||
    !shallowEqual(nextVNode.children, prevVNode.children)
  );
};

function update(node) {
  const prevTree = node.childNodes[0].__vnode;
  const nextTree = expandTree(node.__vnode);

  // debug
  console.log({ prevTree, nextTree });
  window.prevTree = prevTree;
  window.nextTree = nextTree;

  const el = prevTree.__ref;
  updateElementProps(el, nextTree.props, prevTree.props);

  const prevChildren = prevTree.children;
  const nextChildren = nextTree.children;

  // Special cases:
  if (!prevChildren.length && !nextChildren.length) {
    return;
  }

  if (prevChildren.length && !nextChildren.length) {
    el.innerHTML = "";
    return;
  }

  if (!prevChildren.length && nextChildren.length) {
    nextChildren.forEach((child) => el.appendChild(renderElement(child)));
    return;
  }
}
