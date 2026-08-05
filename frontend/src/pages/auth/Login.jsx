import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BRAND } from "../../config/brand";

const rolePaths = {
  citizen: { label: "Citizen", hint: "Report issues and track public projects.", next: "/map" },
  official: { label: "Official", hint: "Open the command center and planning tools.", next: "/dashboard" },
  admin: { label: "Admin", hint: "Manage organizations and API usage.", next: "/admin" },
};

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "citizen";
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const selectedRole = useMemo(() => rolePaths[role] || rolePaths.citizen, [role]);

  const updateRole = (nextRole) => {
    setRole(nextRole);
    setSearchParams({ role: nextRole });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await login(form.email, form.password);
      const nextRole = response?.user?.role;
      if (nextRole === "official") navigate("/dashboard");
      else if (nextRole === "admin") navigate("/admin");
      else navigate("/map");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not sign in");
    }
  };

  const submitGoogle = async () => {
    setError("");
    try {
      const response = await loginWithGoogle({ role });
      const nextRole = response?.user?.role;
      if (nextRole === "official") navigate("/dashboard");
      else if (nextRole === "admin") navigate("/admin");
      else navigate("/map");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not sign in with Google");
    }
  };

  return (
    <div className="fw-container py-10">
      <div className="ibm-hero overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_.95fr]">
          <div className="p-8 md:p-10 lg:p-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e6ff] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f62fe]">
              Secure access
            </div>
            <h1 className="ibm-title mt-6">Sign in with email and password.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4b5563]">
              Pick the right workspace first, then continue with email/password or Google. Each role gets its own path so the flow stays clear.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Object.entries(rolePaths).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateRole(key)}
                  className={role === key ? "ibm-button-primary" : "ibm-button-ghost"}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <div className="text-sm font-semibold text-[#111827]">Selected workspace</div>
                <div className="mt-1 text-sm text-[#4b5563]">{selectedRole.hint}</div>
              </div>
              <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <div className="text-sm font-semibold text-[#111827]">Email/password supported</div>
                <div className="mt-1 text-sm text-[#4b5563]">Use the form on the right to sign in directly.</div>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="border-t border-[#e5edf7] bg-white/80 p-8 md:p-10 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-3">
              <img src={BRAND.logoIconDark} alt={BRAND.name} className="h-10 w-10" />
              <div>
              <h2 className="text-2xl font-semibold text-[#111827]">Welcome back</h2>
              <p className="ibm-caption">{selectedRole.label} sign in</p>
            </div>
            </div>

            {error && <div className="mt-5 ibm-badge ibm-badge--danger w-full justify-start">{error}</div>}

            <label className="mt-6 block text-sm font-medium text-[#111827]">
              Email address
              <input type="email" className="ibm-input mt-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="mt-4 block text-sm font-medium text-[#111827]">
              Password
              <input type="password" className="ibm-input mt-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>

            <button className="ibm-button-primary mt-6 w-full justify-center" type="submit">
              Sign in
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e0e0e0]" />
              <span className="text-xs uppercase tracking-[0.18em] text-[#525252]">or</span>
              <div className="h-px flex-1 bg-[#e0e0e0]" />
            </div>

            <button type="button" onClick={submitGoogle} className="ibm-button-secondary w-full justify-center">
              Continue with Google
            </button>

            <div className="mt-5 rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4 text-sm text-[#4b5563]">
              {selectedRole.label} users can create an account from the matching sign-up page. If you are an official, use the official sign-up flow instead of the public citizen form.
            </div>

            <p className="mt-4 text-sm text-[#525252]">
              Need an account? <Link className="text-[#0f62fe]" to={`/register?role=${role}`}>Create one</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
