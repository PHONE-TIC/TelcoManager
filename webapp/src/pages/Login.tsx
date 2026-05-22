import { useState } from "react";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import logo from "../assets/logo.png";

interface ApiErrorResponse {
  error?: string;
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Trim username input to accept spaces gracefully (e.g. from password manager copy-paste)
      await login(username.trim(), password);
      navigate("/");
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(axiosError.response?.data?.error || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo" />
          <h1 className="login-title">Connexion</h1>
          <p className="login-subtitle">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "8px", display: "block" }}>
              Identifiant
            </label>
            <input
              type="text"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre identifiant"
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: "24px" }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "8px", display: "block" }}>
              Mot de passe
            </label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn-submit"
            style={{ width: "100%", padding: "14px", border: "none" }}
            disabled={loading}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="login-footer">
          <p>© {new Date().getFullYear()} PHONE&TIC. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
