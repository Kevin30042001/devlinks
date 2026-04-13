import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../services/firebase";

const AuthContext = createContext(null);

const THEMES = ["violet", "cyan", "rose", "amber", "emerald"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          const profile = snap.data();
          setUserProfile(profile);
          document.documentElement.setAttribute("data-theme", profile.theme || "violet");
        }
      } else {
        setUserProfile(null);
        document.documentElement.setAttribute("data-theme", "violet");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function isUsernameTaken(username) {
    const ref = doc(db, "usernames", username);
    const snap = await getDoc(ref);
    return snap.exists();
  }

  async function saveUserProfile(uid, data) {
    await setDoc(doc(db, "users", uid), {
      ...data,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "usernames", data.username), { uid });
  }

  async function register(name, email, password, username) {
    const taken = await isUsernameTaken(username);
    if (taken) throw new Error("Este username ya está en uso");

    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser, { displayName: name });
    await saveUserProfile(newUser.uid, { name, email, username, bio: "", theme: "violet" });

    return newUser;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    const { user: googleUser } = await signInWithPopup(auth, googleProvider);
    const ref = doc(db, "users", googleUser.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const baseUsername = googleUser.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase();
      const username = `${baseUsername}_${googleUser.uid.slice(0, 5)}`;
      await saveUserProfile(googleUser.uid, {
        name: googleUser.displayName || "",
        email: googleUser.email,
        username,
        bio: "",
        theme: "violet",
      });
    }

    return googleUser;
  }

  async function updateTheme(theme) {
    if (!user) return;
    document.documentElement.setAttribute("data-theme", theme);
    setUserProfile((prev) => ({ ...prev, theme }));
    await updateDoc(doc(db, "users", user.uid), { theme });
  }

  async function updateBio(bio) {
    if (!user) return;
    setUserProfile((prev) => ({ ...prev, bio }));
    await updateDoc(doc(db, "users", user.uid), { bio });
  }

  async function logout() {
    return signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, register, login, loginWithGoogle, logout, updateTheme, updateBio, THEMES }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}