import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Verifica si un username ya está tomado antes de crear la cuenta
  async function isUsernameTaken(username) {
    const ref = doc(db, "usernames", username);
    const snap = await getDoc(ref);
    return snap.exists();
  }

  // Guarda el perfil del usuario en Firestore al registrarse
  async function saveUserProfile(uid, data) {
    await setDoc(doc(db, "users", uid), {
      ...data,
      createdAt: serverTimestamp(),
    });
    // Reserva el username para que nadie más lo pueda tomar
    await setDoc(doc(db, "usernames", data.username), { uid });
  }

  async function register(name, email, password, username) {
    const taken = await isUsernameTaken(username);
    if (taken) throw new Error("Este username ya está en uso");

    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(newUser, { displayName: name });
    await saveUserProfile(newUser.uid, { name, email, username, bio: "", theme: "default" });

    return newUser;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    const { user: googleUser } = await signInWithPopup(auth, googleProvider);

    // Si ya existe en Firestore no hacemos nada, si es nuevo lo registramos
    const ref = doc(db, "users", googleUser.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Genera un username provisional a partir del email
      const baseUsername = googleUser.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase();
      const username = `${baseUsername}_${googleUser.uid.slice(0, 5)}`;

      await saveUserProfile(googleUser.uid, {
        name: googleUser.displayName || "",
        email: googleUser.email,
        username,
        bio: "",
        theme: "default",
      });
    }

    return googleUser;
  }

  async function logout() {
    return signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}