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
