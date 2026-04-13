import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";

export function useLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "links"),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLinks(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  async function addLink(title, url) {
    await addDoc(collection(db, "users", user.uid, "links"), {
      title,
      url,
      order: links.length,
      clicks: 0,
      createdAt: serverTimestamp(),
    });
  }

  async function updateLink(linkId, data) {
    await updateDoc(doc(db, "users", user.uid, "links", linkId), data);
  }

  async function deleteLink(linkId) {
    await deleteDoc(doc(db, "users", user.uid, "links", linkId));
  }

  // Actualiza el campo order de todos los links en una sola operación atómica.
  // writeBatch es como una transacción — o se guardan todos los cambios o ninguno.
  async function reorderLinks(reorderedLinks) {
    const batch = writeBatch(db);
    reorderedLinks.forEach((link, index) => {
      batch.update(doc(db, "users", user.uid, "links", link.id), { order: index });
    });
    await batch.commit();
  }

  return { links, loading, addLink, updateLink, deleteLink, reorderLinks };
}