import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BRAND } from "../lib/brand";
import {
  isAppUnlocked,
  unlockApp,
  validateAppPassword,
} from "../lib/access";

export function StartPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"welcome" | "password">("welcome");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isAppUnlocked()) {
    return <Navigate to="/clients" replace />;
  }

  function onGetStarted() {
    setStep("password");
    setError(null);
    setPassword("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const msg = validateAppPassword(password);
    if (msg) {
      setError(msg);
      return;
    }
    unlockApp();
    navigate("/clients", { replace: true });
  }

  return (
    <div className="home-page">
      <picture>
        <source media="(max-width: 768px)" srcSet="/mobile_home.png" />
        <img
          src="/desktop_home.png"
          alt={BRAND.name}
          className="home-page__image"
        />
      </picture>

      <div className="home-page__overlay">
        {step === "welcome" ? (
          <button
            type="button"
            className="home-page__cta"
            onClick={onGetStarted}
          >
            Get Started
          </button>
        ) : (
          <form className="home-page__gate" onSubmit={onSubmit}>
            <p className="home-page__gate-title">Enter password</p>
            <p className="home-page__gate-hint">Minimum 6 characters</p>
            <input
              type="password"
              className="home-page__input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              autoFocus
              minLength={6}
              autoComplete="current-password"
            />
            {error && <p className="home-page__error">{error}</p>}
            <div className="home-page__gate-actions">
              <button
                type="button"
                className="home-page__back"
                onClick={() => {
                  setStep("welcome");
                  setError(null);
                  setPassword("");
                }}
              >
                Back
              </button>
              <button type="submit" className="home-page__cta home-page__cta--compact">
                Access app
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
