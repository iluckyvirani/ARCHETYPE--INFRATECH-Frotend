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
        <div className="start-logo-wrap">
          <img
            src="/logo.png"
            alt={BRAND.name}
            className="start-logo start-logo--enter"
          />
        </div>
        <p className="start-sub start-fade">
          Create clients, track fees, advances, installments and print invoices.
        </p>
        <button
          type="button"
          className="btn btn-primary start-btn start-fade start-fade--late"
          onClick={onStart}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
