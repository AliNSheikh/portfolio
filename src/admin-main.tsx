import { createRoot } from "react-dom/client";
import AdminApp from "./admin/App";
import "./admin.css";
createRoot(document.getElementById("admin-root")!).render(<AdminApp />);
