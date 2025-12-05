import NavBarAdmin from "./NavBarAdmin";
import "./NavBarAdmin.css";
import "./AdminLayout.css";
import "../App.css"; // optional if you want consistent background, etc.

export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <NavBarAdmin />
      <main className="admin-main">{children}</main>
    </div>
  );
}
