import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../context/AuthContext";
import { useLinks } from "../hooks/useLinks";
import "../styles/dashboard.css";
import "../styles/auth.css";

const THEME_COLORS = {
  violet: "#7c3aed",
  cyan: "#0891b2",
  rose: "#e11d48",
  amber: "#d97706",
  emerald: "#059669",
};

function SortableLink({ link, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: link.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li className="link-item" ref={setNodeRef} style={style}>
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <div className="link-info">
        <div className="link-title">{link.title}</div>
        <div className="link-url">{link.url}</div>
      </div>
      <span className="link-clicks">{link.clicks} clics</span>
      <div className="link-actions">
        <button className="btn-icon" onClick={() => onEdit(link)}>Editar</button>
        <button className="btn-icon btn-danger" onClick={() => onDelete(link.id)}>Eliminar</button>
      </div>
    </li>
  );
}

function Dashboard() {
  const { user, userProfile, logout, updateTheme, THEMES } = useAuth();
  const { links, loading, addLink, updateLink, deleteLink, reorderLinks } = useLinks();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: "", url: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [error, setError] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }));

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!form.url.startsWith("http")) {
      setError("La URL debe empezar con http:// o https://");
      return;
    }
    await addLink(form.title, form.url);
    setForm({ title: "", url: "" });
  }

  function startEdit(link) {
    setEditingId(link.id);
    setEditForm({ title: link.title, url: link.url });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    await updateLink(editingId, { title: editForm.title, url: editForm.url });
    setEditingId(null);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex);
    await reorderLinks(reordered);
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (loading) return <p style={{ padding: 24, color: "var(--text-muted)" }}>Cargando...</p>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="header-logo">DevLinks</span>
        <div className="header-actions">
          {userProfile?.username && (
            <Link
              className="btn-ghost btn-sm"
              to={`/${userProfile.username}`}
              target="_blank"
            >
              Ver perfil ↗
            </Link>
          )}
          <button className="btn-ghost btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="dashboard-body">
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card">
            <h2 className="card-title">Agregar link</h2>
            <form className="add-link-form" onSubmit={handleAdd}>
              <input
                className="input"
                type="text"
                placeholder="Título (ej: Mi GitHub)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <input
                className="input"
                type="url"
                placeholder="URL (ej: https://github.com/usuario)"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
              />
              {error && <p className="auth-error">{error}</p>}
              <button className="btn btn-primary" type="submit">Agregar</button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-title">Tema de color</h2>
            <div className="themes-grid">
              {THEMES.map((theme) => (
                <button
                  key={theme}
                  className={`theme-btn ${userProfile?.theme === theme ? "active" : ""}`}
                  style={{ background: THEME_COLORS[theme] }}
                  onClick={() => updateTheme(theme)}
                  title={theme}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Tus links ({links.length})</h2>
          {links.length === 0 ? (
            <p className="empty-state">No tienes links todavía.<br />¡Agrega el primero!</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                <ul className="links-list">
                  {links.map((link) =>
                    editingId === link.id ? (
                      <li className="link-item" key={link.id}>
                        <form className="edit-form" onSubmit={handleUpdate}>
                          <input
                            className="input"
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            required
                          />
                          <input
                            className="input"
                            type="url"
                            value={editForm.url}
                            onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                            required
                          />
                          <button className="btn-icon" type="submit">✓</button>
                          <button className="btn-icon" type="button" onClick={() => setEditingId(null)}>✕</button>
                        </form>
                      </li>
                    ) : (
                      <SortableLink
                        key={link.id}
                        link={link}
                        onEdit={startEdit}
                        onDelete={deleteLink}
                      />
                    )
                  )}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;