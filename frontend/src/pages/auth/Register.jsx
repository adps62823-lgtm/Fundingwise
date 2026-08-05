import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BRAND } from "../../config/brand";

const roleInfo = {
  citizen: {
    title: "Citizen account",
    text: "For public issue reporting and project tracking with email/password.",
    next: "/map",
  },
  official: {
    title: "Official account",
    text: "For municipal planning and internal workflows in a separate workspace.",
    next: "/dashboard",
  },
};

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "citizen";
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({ name: "", email: "", password: "", organization_id: "" });
  const [error, setError] = useState("");

  const selectedRole = useMemo(() => roleInfo[role] || roleInfo.citizen, [role]);

  const updateRole = (nextRole) => {
    setRole(nextRole);
    setSearchParams({ role: nextRole });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await register({
        ...form,
        role,
        organization_id: role === "official" ? form.organization_id || null : null,
      });
      const nextRole = response?.user?.role;
      if (nextRole === "official") navigate("/dashboard");
      else if (nextRole === "admin") navigate("/admin");
      else navigate("/map");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not create account");
    }
  };

  const submitGoogle = async () => {
    setError("");
    try {
      const response = await loginWithGoogle({
        role,
        organization_id: role === "official" ? form.organization_id || null : null,
      });
      const nextRole = response?.user?.role;
      if (nextRole === "official") navigate("/dashboard");
      else if (nextRole === "admin") navigate("/admin");
      else navigate("/map");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not create account with Google");
    }
  };

  return (
    <div className="fw-container py-10">
      <div className="ibm-hero overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_.95fr]">
          <div className="p-8 md:p-10 lg:p-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e6ff] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f62fe]">
              Create account
            </div>
            <h1 className="ibm-title mt-6">Create an email/password account.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4b5563]">
              Choose whether you are signing up as a citizen or an official. Each flow stays separate so the right workspace opens after registration.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Object.entries(roleInfo).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateRole(key)}
                  className={role === key ? "ibm-button-primary" : "ibm-button-ghost"}
                >
                  {item.title}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <div className="text-sm font-semibold text-[#111827]">{selectedRole.title}</div>
                <div className="mt-1 text-sm text-[#4b5563]">{selectedRole.text}</div>
              </div>
              <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <div className="text-sm font-semibold text-[#111827]">Email/password first</div>
                <div className="mt-1 text-sm text-[#4b5563]">Use the form on the right to create the account directly.</div>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="border-t border-[#e5edf7] bg-white/80 p-8 md:p-10 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-3">
              <img src={BRAND.logoIconDark} alt={BRAND.name} className="h-10 w-10" />
              <div>
                <h2 className="text-2xl font-semibold text-[#111827]">Create account</h2>
                <p className="ibm-caption">{selectedRole.title}</p>
              </div>
            </div>

            {error && <div className="mt-5 ibm-badge ibm-badge--danger w-full justify-start">{error}</div>}

            <label className="mt-6 block text-sm font-medium text-[#111827]">
              Full name
              <input className="ibm-input mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="mt-4 block text-sm font-medium text-[#111827]">
              Email address
              <input type="email" className="ibm-input mt-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="mt-4 block text-sm font-medium text-[#111827]">
              Password
              <input type="password" className="ibm-input mt-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>

            {role === "official" && (
              <label className="mt-4 block text-sm font-medium text-[#111827]">
                Organization ID
                <input className="ibm-input mt-2" value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })} />
                <span className="mt-2 block text-xs text-[#6b7280]">
                  Officials should connect to a provisioned organization record so the dashboard stays separated from public accounts.
                </span>
              </label>
            )}

            <button className="ibm-button-primary mt-6 w-full justify-center" type="submit">
              Create account
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
              If you are creating an official account, make sure your organization has already been provisioned. Citizens can sign up without an organization ID.
            </div>

            <p className="mt-4 text-sm text-[#525252]">
              Already have an account? <Link className="text-[#0f62fe]" to={`/login?role=${role}`}>Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
