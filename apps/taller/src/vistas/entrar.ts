import { html } from "../html";
import { layout } from "./layout";

export function vistaEntrar(error?: string): string {
  const contenido = html`
    <form method="post" action="/entrar" class="entrar">
      <p class="ayuda">Panel interno de órdenes de servicio.</p>

      ${error ? html`<p class="aviso-error" role="alert">${error}</p>` : ""}

      <label for="contrasena">Contraseña</label>
      <input
        id="contrasena"
        name="contrasena"
        type="password"
        autocomplete="current-password"
        autofocus
        required
      />

      <button type="submit" class="principal">Entrar</button>
    </form>
  `;

  return layout({ titulo: "Entrar", contenido });
}
