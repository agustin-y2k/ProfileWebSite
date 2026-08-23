import { pricing } from "@sites/negocio";
import { html, type Html } from "../html";
import { ACCESORIOS, TIPOS_EQUIPO, type DatosOrden } from "../ordenes";
import { layout } from "./layout";

type Opciones = {
  datos: DatosOrden;
  errores: Record<string, string>;
};

function error(errores: Record<string, string>, campo: string): Html | string {
  const mensaje = errores[campo];
  return mensaje ? html`<p class="error" id="error-${campo}">${mensaje}</p>` : "";
}

/** `aria-describedby` solo cuando hay error: si no, apunta a un id inexistente. */
function describe(errores: Record<string, string>, campo: string): Html | string {
  return errores[campo]
    ? html`aria-describedby="error-${campo}" aria-invalid="true"`
    : "";
}

export function vistaNueva({ datos, errores }: Opciones): string {
  const contenido = html`
    <form method="post" action="/ordenes" id="orden" novalidate>
      ${
        Object.keys(errores).length > 0
          ? html`<p class="aviso-error" role="alert">
              Faltan datos para poder emitir el comprobante. Está todo lo que escribiste,
              revisá lo marcado en rojo.
            </p>`
          : ""
      }

      <!-- El borrador nunca se aplica solo: se ofrece y se decide. Un
           formulario que aparece con el nombre y las fotos de otra persona es
           peor que uno vacío. -->
      <div class="borrador" data-borrador hidden>
        <p>Quedó una carga sin terminar <span data-borrador-cuando></span>.</p>
        <div class="borrador-botones">
          <button type="button" class="secundario" data-borrador-retomar>Retomar</button>
          <button type="button" class="secundario" data-borrador-descartar>
            Descartar
          </button>
        </div>
      </div>

      <p class="ayuda">
        Solo los datos del cliente son obligatorios: son los que hacen falta para
        mandarle el comprobante. Todo el resto se puede dejar vacío ahora y completar
        después desde la orden.
      </p>

      <fieldset>
        <legend>Cliente</legend>

        <!-- Los tres campos van con autocomplete="off" y no con los valores
             semánticos (name, tel, email): son datos del cliente, no de quien
             usa el navegador. Con el valor semántico, Chrome ofrece —y a veces
             completa solo— los datos de Ramiro en la ficha de otra persona. -->
        <label for="cliente_nombre">Nombre y apellido <span class="req">*</span></label>
        <input
          id="cliente_nombre"
          name="cliente_nombre"
          value="${datos.cliente_nombre}"
          autocomplete="off"
          autocapitalize="words"
          enterkeyhint="next"
          ${describe(errores, "cliente_nombre")}
        />
        ${error(errores, "cliente_nombre")}

        <label for="cliente_telefono">Teléfono <span class="req">*</span></label>
        <input
          id="cliente_telefono"
          name="cliente_telefono"
          type="tel"
          inputmode="tel"
          value="${datos.cliente_telefono}"
          autocomplete="off"
          ${describe(errores, "cliente_telefono")}
        />
        ${error(errores, "cliente_telefono")}

        <label for="cliente_email">Correo <span class="req">*</span></label>
        <input
          id="cliente_email"
          name="cliente_email"
          type="email"
          inputmode="email"
          value="${datos.cliente_email}"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          ${describe(errores, "cliente_email")}
        />
        ${error(errores, "cliente_email")}

        <label for="cliente_dni">DNI <span class="opt">opcional</span></label>
        <input
          id="cliente_dni"
          name="cliente_dni"
          inputmode="numeric"
          value="${datos.cliente_dni}"
        />
      </fieldset>

      <fieldset>
        <legend>Equipo <span class="opt">opcional</span></legend>

        <span class="etiqueta">Tipo</span>
        <div class="opciones" role="group" aria-label="Tipo de equipo">
          ${TIPOS_EQUIPO.map(
            (tipo) => html`
              <label class="chip">
                <input
                  type="radio"
                  name="equipo_tipo"
                  value="${tipo}"
                  ${datos.equipo_tipo === tipo ? "checked" : ""}
                />
                <span>${tipo}</span>
              </label>
            `,
          )}
        </div>

        <div class="par">
          <div>
            <label for="marca">Marca</label>
            <input
              id="marca"
              name="marca"
              value="${datos.marca}"
              autocapitalize="words"
            />
          </div>
          <div>
            <label for="modelo">Modelo</label>
            <input id="modelo" name="modelo" value="${datos.modelo}" />
          </div>
        </div>

        <label for="serie">Número de serie</label>
        <input
          id="serie"
          name="serie"
          value="${datos.serie}"
          autocapitalize="characters"
        />

        <span class="etiqueta">Se recibe con</span>
        <div class="opciones" role="group" aria-label="Accesorios recibidos">
          ${ACCESORIOS.map(
            (accesorio) => html`
              <label class="chip">
                <input
                  type="checkbox"
                  name="accesorios"
                  value="${accesorio}"
                  ${datos.accesorios.includes(accesorio) ? "checked" : ""}
                />
                <span>${accesorio}</span>
              </label>
            `,
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>Estado al recibirlo <span class="opt">opcional</span></legend>

        <span class="etiqueta">¿Enciende?</span>
        <div class="opciones" role="group" aria-label="¿Enciende?">
          ${["Sí", "No", "No sé"].map(
            (valor) => html`
              <label class="chip">
                <input
                  type="radio"
                  name="enciende"
                  value="${valor}"
                  ${datos.enciende === valor ? "checked" : ""}
                />
                <span>${valor}</span>
              </label>
            `,
          )}
        </div>

        <label for="observaciones">
          Marcas, golpes, faltantes <span class="opt">opcional</span>
        </label>
        <textarea id="observaciones" name="observaciones" rows="2">
${datos.observaciones}</textarea>
        <span class="etiqueta">Fotos del equipo</span>
        <div class="fotos" data-fotos>
          <ul class="fotos-lista" data-fotos-lista>
            ${datos.fotos.map(
              (id) => html`
                <li data-foto="${id}">
                  <img src="/fotos/${id}" alt="Foto del equipo" />
                  <button type="button" class="quitar" data-foto-quitar>
                    <span aria-hidden="true">×</span>
                    <span class="solo-lectores">Quitar foto</span>
                  </button>
                  <input type="hidden" name="fotos" value="${id}" />
                </li>
              `,
            )}
          </ul>

          <div class="fotos-botones" hidden data-fotos-botones>
            <button type="button" class="secundario" data-foto-camara>Tomar foto</button>
            <button type="button" class="secundario" data-foto-galeria>
              Elegir archivo
            </button>
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            data-foto-entrada-camara
          />
          <input type="file" accept="image/*" multiple hidden data-foto-entrada-galeria />

          <p class="ayuda" data-fotos-estado role="status"></p>
        </div>
        <p class="ayuda">
          Es lo que te respalda si después aparece una marca que el equipo ya traía. Se
          suben mientras seguís cargando, así guardar la orden es instantáneo.
        </p>
      </fieldset>

      <fieldset>
        <legend>Trabajo <span class="opt">opcional</span></legend>

        <label for="servicio_id">Servicio</label>
        <select id="servicio_id" name="servicio_id">
          <option value="">Elegir…</option>
          ${pricing.map(
            (fila) => html`
              <option
                value="${fila.id}"
                data-tarifa="${fila.price}"
                ${datos.servicio_id === fila.id ? "selected" : ""}
              >
                ${fila.service} — ${fila.price}${fila.note ? ` (${fila.note})` : ""}
              </option>
            `,
          )}
        </select>

        <label for="falla">Falla que reporta el cliente</label>
        <textarea id="falla" name="falla" rows="2">${datos.falla}</textarea>

        <div class="par">
          <div>
            <label for="presupuesto">Presupuesto estimado</label>
            <input
              id="presupuesto"
              name="presupuesto"
              value="${datos.presupuesto}"
            />
          </div>
          <div>
            <label for="plazo">Plazo estimado</label>
            <input id="plazo" name="plazo" value="${datos.plazo}" />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Firma del cliente <span class="opt">opcional</span></legend>
        <p class="ayuda">
          Si el cliente no puede o no quiere firmar, la orden se guarda igual y el
          comprobante deja constancia de que se envió por correo.
        </p>

        <div class="firma" data-firma hidden>
          <canvas data-firma-lienzo width="600" height="220" aria-label="Área de firma">
          </canvas>
          <input type="hidden" name="firma" value="${datos.firma}" data-firma-valor />
        </div>
        ${error(errores, "firma")}

        <div class="firma-botones">
          <button type="button" class="secundario" data-firma-abrir>Firmar</button>
          <button type="button" class="secundario" data-firma-borrar hidden>
            Borrar firma
          </button>
        </div>
      </fieldset>

      <button type="submit" class="principal">Guardar orden</button>
      <p class="ayuda centrado" data-borrador-aviso hidden>
        Se guarda un borrador en este teléfono mientras completás.
      </p>
    </form>

    <script src="/formulario.js" defer></script>
  `;

  return layout({ titulo: "Nueva orden", volver: "/", contenido });
}
