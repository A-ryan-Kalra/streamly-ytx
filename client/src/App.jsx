import { Route, Routes } from "react-router-dom";
import Lobby from "./screens/Lobby";
import Room from "./screens/Room";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <div className="">
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
