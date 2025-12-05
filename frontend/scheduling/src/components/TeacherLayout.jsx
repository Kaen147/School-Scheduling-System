// src/components/TeacherLayout.jsx
import { Outlet } from "react-router-dom";
import NavBarTeacher from "./NavBarTeacher";
import "./TeacherLayout.css";

export default function TeacherLayout() {
  return (
    <div className="teacher-layout">
      <NavBarTeacher />
      <main className="teacher-main-content">
        <Outlet />
      </main>
    </div>
  );
}
