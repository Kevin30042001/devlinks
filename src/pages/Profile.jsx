import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  getDoc,
  increment,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      // Primero busca el uid asociado a ese username
      const usernameSnap = await getDoc(doc(db, "usernames", username));

      if (!usernameSnap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { uid } = usernameSnap.data();

      const userSnap = await getDoc(doc(db, "users", uid));
      setProfile({ uid, ...userSnap.data() });

      const q = query(
        collection(db, "users", uid, "links"),
        orderBy("order", "asc")
      );
      const linksSnap = await getDocs(q);
      setLinks(linksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }

    loadProfile();
  }, [username]);

  async function handleLinkClick(link) {
    // Incrementa el contador sin esperar la respuesta para que el clic sea inmediato
    await updateDoc(doc(db, "users", profile.uid, "links", link.id), {
      clicks: increment(1),
    });
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  if (loading) return <p>Cargando...</p>;
  if (notFound) return <p>Usuario @{username} no encontrado.</p>;

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>@{profile.username}</p>
      {profile.bio && <p>{profile.bio}</p>}

      <ul>
        {links.map((link) => (
          <li key={link.id}>
            <button onClick={() => handleLinkClick(link)}>
              {link.title}
            </button>
          </li>
        ))}
      </ul>

      {links.length === 0 && <p>Este usuario no tiene links todavía.</p>}
    </div>
  );
}

export default Profile;