import { useNavigate } from "react-router-dom";
import { BRAND } from "../lib/brand";

export function StartPage() {
  const navigate = useNavigate();

  function onStart() {
    sessionStorage.setItem("artech-started", "1");
    navigate("/clients/new");
  }

  return (
    <div className="start-page">
      <div className="start-card">
        <img src="/logo.png" alt={BRAND.name} className="start-logo" />
        <h1 className="start-title">{BRAND.name}</h1>
        <p className="start-desc">{BRAND.tagline}</p>
        <p className="start-sub">
          Create clients, track fees, advances, installments and print invoices.
        </p>
        <button type="button" className="btn btn-primary start-btn" onClick={onStart}>
          Get Started
        </button>
      </div>
    </div>
  );
}
