import { LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordInput } from "../components/PasswordInput";
import {
  changeAppPassword,
  getLoginName,
  logoutApp,
  updateLoginName,
} from "../lib/access";

export function ProfilePage() {
  const navigate = useNavigate();
  const [name, setName] = useState(getLoginName);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);

  function onSaveName(e: FormEvent) {
    e.preventDefault();
    setNameOk(false);
    const err = updateLoginName(name);
    if (err) {
      setNameMsg(err);
      return;
    }
    setName(getLoginName());
    setNameMsg(null);
    setNameOk(true);
  }

  function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwOk(false);
    const err = changeAppPassword(
      currentPassword,
      newPassword,
      confirmPassword
    );
    if (err) {
      setPwMsg(err);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwMsg(null);
    setPwOk(true);
  }

  function onLogout() {
    logoutApp();
    navigate("/", { replace: true });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Login name, password, and logout</p>
        </div>
      </header>

      <section className="panel profile-card">
        <div className="profile-avatar" aria-hidden>
          {name.trim().charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <p className="profile-name">{name.trim() || "User"}</p>
          <p className="profile-role">Logged in</p>
        </div>
      </section>

      <section className="panel">
        <h2 className="profile-section-title">Your name</h2>
        <form className="form-grid" onSubmit={onSaveName}>
          <label className="field">
            Display name
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameMsg(null);
                setNameOk(false);
              }}
              autoComplete="name"
              required
            />
          </label>
          {nameMsg && <p className="error-text">{nameMsg}</p>}
          {nameOk && <p className="ok-text">Name saved.</p>}
          <div>
            <button type="submit" className="btn btn-dark">
              Save name
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="profile-section-title">Change password</h2>
        <form className="form-grid" onSubmit={onChangePassword}>
          <label className="field">
            Current password
            <PasswordInput
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPwMsg(null);
                setPwOk(false);
              }}
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>
          <label className="field">
            New password
            <PasswordInput
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPwMsg(null);
                setPwOk(false);
              }}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <label className="field">
            Confirm new password
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPwMsg(null);
                setPwOk(false);
              }}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          {pwMsg && <p className="error-text">{pwMsg}</p>}
          {pwOk && <p className="ok-text">Password updated.</p>}
          <div>
            <button type="submit" className="btn btn-dark">
              Update password
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="profile-section-title">Session</h2>
        <p className="meta" style={{ marginBottom: "1rem" }}>
          Sign out of this browser. You will need the password to open the app
          again.
        </p>
        <button type="button" className="btn btn-danger" onClick={onLogout}>
          <LogOut size={18} strokeWidth={2} aria-hidden />
          Logout
        </button>
      </section>
    </>
  );
}
