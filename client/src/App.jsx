import { Route, Routes } from "react-router-dom";
import Lobby from "./screens/Lobby";

function App() {
  return (
    <div className="">
      <Routes>
        <Route path="/" element={<Lobby />} />
      </Routes>
    </div>
  );
}

export default App;
