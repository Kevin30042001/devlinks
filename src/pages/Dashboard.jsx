import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

// Componente individual de cada link con soporte para drag
function SortableLink({ link, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: link.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      {/* El ícono ⠿ es el área de agarre para arrastrar */}
      <span {...attributes} {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
        ⠿
      </span>
      <span>{link.title}</span>
      <span> — {link.url}</span>
      <span> ({link.clicks} clics)</span>
      <button onClick={() => onEdit(link)}>Editar</button>
      <button onClick={() => onDelete(link.id)}>Eliminar</button>
    </li>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const { links, loading, addLink, updateLink, deleteLink, reorderLinks } = useLinks();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: "", url: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [error, setError] = useState("");

  // PointerSensor requiere que el usuario arrastre al menos 8px antes de activar
  // el drag, para no interferir con los clics en botones
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

    // arrayMove reorganiza el array localmente para que la UI responda de inmediato,
    // luego reorderLinks persiste el nuevo orden en Firestore
    const reordered = arrayMove(links, oldIndex, newIndex);
    await reorderLinks(reordered);
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul>
              {links.map((link) =>
                editingId === link.id ? (
                  <li key={link.id}>
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
      </section>
    </div>
  );
}

export default Dashboard;