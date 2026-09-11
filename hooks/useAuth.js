"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const NATIVE_REDIRECT_URL = "com.understandingquran.app://login-callback";

// Function, not a module-level constant -- window.Capacitor attaches
// asynchronously, so a constant computed at parse time could freeze in as
// false before the bridge actually arrives (lesson carried over from
// musalleen/mustaghfirin, both hit this bug reactively).
const isNativeApp = () => typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();

const ALIAS_WORDS = ["Reader", "Seeker", "Student", "Wayfarer", "Traveler"];
const generateAlias = () => {
  const word = ALIAS_WORDS[Math.floor(Math.random() * ALIAS_WORDS.length)];
  return `${word}-${Math.floor(100 + Math.random() * 900)}`;
};

export function useAuth() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [authBusy, setAuthBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Native Google sign-in: the OAuth screen opens in a Chrome Custom Tab
  // (Google blocks it inside embedded WebViews), and this listens for the
  // custom-scheme redirect back into the app to exchange the PKCE code.
  useEffect(() => {
    console.log("[QuranAuth] mount check: isNativeApp=", isNativeApp(), "App plugin present=", !!window.Capacitor?.Plugins?.App);
    if (!isNativeApp() || !window.Capacitor?.Plugins?.App) return;
    console.log("[QuranAuth] registering appUrlOpen listener");
    const handle = window.Capacitor.Plugins.App.addListener("appUrlOpen", async ({ url }) => {
      console.log("[QuranAuth] appUrlOpen fired, url=", url);
      if (!url || !url.includes("login-callback")) {
        console.log("[QuranAuth] url did not match login-callback, ignoring");
        return;
      }
      try {
        const code = new URL(url).searchParams.get("code");
        console.log("[QuranAuth] extracted code present=", !!code);
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          console.log("[QuranAuth] exchangeCodeForSession error=", error ? error.message : "none", "session set=", !!data?.session);
        }
      } catch (e) {
        console.error("[QuranAuth] Native sign-in exchange failed:", e);
      } finally {
        window.Capacitor.Plugins.Browser?.close();
      }
    });
    return () => { handle?.then?.((h) => h.remove()); };
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session?.user) { setProfile(undefined); return; }
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (prof) { setProfile(prof); return; }
      const { data: created, error } = await supabase.from("profiles").insert({
        id: session.user.id,
        alias: generateAlias(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }).select().single();
      if (!error) setProfile(created);
    })();
  }, [session]);

  const signInGoogle = useCallback(async () => {
    setAuthBusy(true);
    try {
      if (isNativeApp()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: NATIVE_REDIRECT_URL, skipBrowserRedirect: true },
        });
        console.log("[QuranAuth] signInWithOAuth (native) error=", error ? error.message : "none", "url=", data?.url);
        if (error) throw error;
        if (data?.url) await window.Capacitor?.Plugins?.Browser?.open({ url: data.url });
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Google sign-in failed:", e);
    } finally {
      // Always release the button once the flow's been kicked off (success
      // or failure) -- resetting only on the error path left this stuck
      // disabled after a sign-out in an earlier build of a sibling app.
      setAuthBusy(false);
    }
  }, []);

  const signInEmail = useCallback(async () => {
    if (!email.trim()) return;
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: isNativeApp() ? undefined : window.location.origin },
      });
      if (error) throw error;
      setEmailSent(true);
    } catch (e) {
      console.error("Email sign-in failed:", e);
    } finally {
      setAuthBusy(false);
    }
  }, [email]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(undefined);
    setAuthBusy(false);
    setEmail("");
    setEmailSent(false);
  }, []);

  const exitApp = () => window.Capacitor?.Plugins?.App?.exitApp();

  return {
    session, profile, authBusy, email, setEmail, emailSent,
    signInGoogle, signInEmail, signOut, isNativeApp, exitApp,
  };
}
