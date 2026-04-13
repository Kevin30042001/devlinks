import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  increment,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import "../styles/profile.css";

function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const usernameSnap = await getDoc(doc(db, "usernames", username));

      if (!usernameSnap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { uid } = usernameSnap.data();
      const userSnap = await getDoc(doc(db, "users", uid));
      const profileData = { uid, ...userSnap.data() };
      setProfile(profileData);

      // Aplica el tema del usuario en la página de perfil público
      document.documentElement.setAttribute("data-theme", profileData.theme || "violet");

      const q = query(collection(db, "users", uid, "links"), orderBy("order", "asc"));
      const linksSnap = await getDocs(q);
      setLinks(linksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }

    loadProfile();
  }, [username]);

  async function handleLinkClick(link) {
    await updateDoc(doc(db, "users", profile.uid, "links", link.id), {
      clicks: increment(1),
    });
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  if (loading) return <p style={{ padding: 24, color: "var(--text-muted)" }}>Cargando...</p>;

  if (notFound) {
    return (
      <div className="profile-not-found">
        <h2>Usuario no encontrado</h2>
        <p>@{username} no existe en DevLinks</p>
        <Link to="/register" style={{ color: "var(--accent)" }}>Crea tu perfil</Link>
      </div>
    );
  }

  const initial = profile.name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="profile-page">
      <div className="profile-avatar">{initial}</div>
      <h1 className="profile-name">{profile.name}</h1>
      <p className="profile-username">@{profile.username}</p>
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      <ul className="profile-links">
        {links.map((link) => (
          <li key={link.id}>
            <button className="profile-link-btn" onClick={() => handleLinkClick(link)}>
              <span>{link.title}</span>
            </button>
          </li>
        ))}
      </ul>

      {links.length === 0 && (
        <p style={{ color: "var(--text-muted)", marginTop: 32 }}>
          Este usuario no tiene links todavía.
        </p>
      )}

      <p className="profile-footer">
        Hecho con <Link to="/register">DevLinks</Link>
      </p>
    </div>
  );
}

export default Profile;