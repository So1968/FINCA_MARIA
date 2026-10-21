const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const params = new URLSearchParams(location.search);
const next = params.get("next");
const explicitNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Connexion…";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: form.email.value, password: form.password.value })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Connexion refusée");

    const roles = Array.isArray(body?.user?.roles) ? body.user.roles : [];
    const isAdmin = roles.includes("admin-projet") || roles.includes("admin-secretariat");
    const isHeritier = roles.includes("heritier");
    const destination = explicitNext || (!isAdmin && isHeritier ? "/family/" : "/");
    location.replace(destination);
  } catch (error) {
    message.textContent = error.message || "Connexion impossible";
  }
});
