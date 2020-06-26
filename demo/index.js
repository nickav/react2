//
// Demo App
//

const state = {
  times: 0,
};

const App = ({ text }) => {
  return createElement("div", { class: "App", "data-rng": Math.random() }, [
    createElement("h1", null, [text]),
    createElement("div", null, `The time is now: ${new Date().toLocaleString()}`),
    createElement("button", { onClick: console.log }, `Click me!`),
    createElement("div", { style: state.times > 3 ? 'background:red' : '' }, `Button is clicked ${state.times} times!`),
    //state.times < 1 && createElement("div", null, `Goodbye!`),
    state.times >= 3 && createElement("div", null, `You clicked 3 times!`),
  ])
};

const app = document.getElementById("app");
render(createElement(App, { text: "This is a test" }), app);

setTimeout(() => {
  state.times += 3;
  update(app);
}, 200);
