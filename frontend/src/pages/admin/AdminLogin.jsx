import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IconMoon, IconSun } from "../../components/Icons.jsx";
import { useShop } from "../../context/shop-context.js";
import { AdminError, buttonClass, inputClass } from "../../admin/AdminUI.jsx";
import { useAdmin } from "../../admin/admin-context.js";

export default function AdminLogin() {
  const { login } = useAdmin();
  const { isDark, toggleTheme } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login(email, password);
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-bg px-4 py-10 text-fg transition-colors duration-500 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-accent" />

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center border border-line-strong text-fg transition-colors hover:border-accent hover:text-accent sm:right-6 sm:top-6"
        aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      >
        {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-[460px] border border-line bg-surface/45 p-5 sm:p-8 lg:p-10">
        <div className="mb-8 text-center">
          <div className="font-display text-[34px] font-light uppercase leading-none tracking-[.28em] text-fg sm:text-[40px]">
            Myintimy
          </div>
          <p className="mt-3 font-sans text-[9px] font-normal uppercase tracking-[.3em] text-muted">
            Administration
          </p>
        </div>

        <AdminError error={error} />

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="field-label">Email</span>
            <input
              className={`${inputClass} mt-1.5`}
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="field-label">Mot de passe</span>
            <input
              className={`${inputClass} mt-1.5`}
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button disabled={busy} className={`${buttonClass} w-full`}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div className="mt-7 text-center">
          <Link to="/" className="lnk text-muted hover:text-fg">
            Retour à la boutique
          </Link>
        </div>
      </div>
    </div>
  );
}
