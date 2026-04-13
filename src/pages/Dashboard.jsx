import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLinks } from "../hooks/useLinks";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user, logout } = useAuth();
  const { links, loading, addLink, updateLink, deleteLink } = useLinks();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: "", url: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [error, setError] = useState("");

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

  async function handleDelete(linkId) {
    await deleteLink(linkId);
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <header>
        <h1>Hola, {user.displayName}</h1>
        <button onClick={handleLogout}>Cerrar sesión</button>
      </header>

      <section>
        <h2>Agregar link</h2>
        <form onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Título (ej: Mi GitHub)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            type="url"
            placeholder="URL (ej: https://github.com/usuario)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
          {error && <p>{error}</p>}
          <button type="submit">Agregar</button>
        </form>
      </section>

      <section>
        <h2>Tus links</h2>
        {links.length === 0 && <p>No tienes links todavía. ¡Agrega el primero!</p>}
        <ul>
          {links.map((link) => (
            <li key={link.id}>
              {editingId === link.id ? (
                <form onSubmit={handleUpdate}>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                  <input
                    type="url"
                    value={editForm.url}
                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                    required
                  />
                  <button type="submit">Guardar</button>
                  <button type="button" onClick={() => setEditingId(null)}>Cancelar</button>
                </form>
              ) : (
                <>
                  <span>{link.title}</span>
                  <span>{link.url}</span>
                  <span>{link.clicks} clics</span>
                  <button onClick={() => startEdit(link)}>Editar</button>
                  <button onClick={() => handleDelete(link.id)}>Eliminar</button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Dashboard;