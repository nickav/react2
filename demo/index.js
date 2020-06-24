//
// Demo App
//
const App = ({ text }) => {
  let times = 0;

  return createElement("div", { class: "App" }, [
    createElement("h1", null, [text]),
    createElement("div", null, `The time is now: ${new Date().toLocaleString()}`),
    createElement("button", { onClick: console.log }, `Click me!`),
    createElement("div", null, `Button is clicked ${times} times!`),
    times >= 3 && createElement("div", null, `You clicked 3 times!`),
  ])
};

const app = document.getElementById("app");
render(createElement(App, { text: "This is a test" }), app);