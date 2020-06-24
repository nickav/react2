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

  // null and booleans are just comments
  if (isEmptyNode(vnode)) {
    return vnode;
  }

  // strings just convert to #text nodes
  if (isTextNode(vnode)) {
    return vnode;
  }

  // fragments are not real elements in the dom
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
  vnode.__ref = el;

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

  // null and booleans are just comments
  if (isEmptyNode(vnode)) {
    return "";
  }

  // strings just convert to #text nodes
  if (isTextNode(vnode)) {
    return vnode;
  }

  // fragments are not real elements in the dom
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
  container.appendChild(renderElement(vnode));
}
