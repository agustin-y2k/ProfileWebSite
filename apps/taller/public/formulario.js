/* ─────────────────────────────────────────────────────────────────────────────
   Cuatro cosas, todas opcionales: si este archivo no carga, el formulario sigue
   funcionando y se puede guardar una orden. Se pierden la firma y las fotos.

   1. Fotos: se redimensionan en el navegador y se suben de a una.
   2. Firma con el dedo.
   3. Autocompletado del presupuesto desde la tarifa del servicio.
   4. Borrador en localStorage mientras se completa.

   El borrador va último a propósito: al restaurar necesita poder volver a
   dibujar las miniaturas, así que las fotos tienen que estar inicializadas.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var formulario = document.getElementById("orden");
  if (!formulario) return;

  function almacen() {
    try {
      // El modo privado de Safari y los navegadores con el almacenamiento
      // bloqueado tiran al acceder, no al escribir.
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  /* ── 1. Fotos ─────────────────────────────────────────────────────────────
     Se suben apenas se sacan, no junto con el formulario: guardar la orden
     queda instantáneo aunque haya cuatro fotos, y una señal mala no arruina
     toda la carga. El redimensionado es lo que hace viable subirlas desde el
     mostrador: una foto de celular pesa varios MB y sale de acá en ~200 KB. */

  var MAX_FOTOS = 6;
  var LADO_MAXIMO = 1600;
  var CALIDAD = 0.75;

  var caja = formulario.querySelector("[data-fotos]");
  var lista = formulario.querySelector("[data-fotos-lista]");
  var botones = formulario.querySelector("[data-fotos-botones]");
  var estado = formulario.querySelector("[data-fotos-estado]");
  var entradaCamara = formulario.querySelector("[data-foto-entrada-camara]");
  var entradaGaleria = formulario.querySelector("[data-foto-entrada-galeria]");

  function cuantasFotos() {
    return lista ? lista.querySelectorAll("[data-foto]").length : 0;
  }

  function avisar(texto) {
    if (estado) estado.textContent = texto || "";
  }

  function agregarFoto(id) {
    if (!lista || !/^[a-f0-9]{32}$/.test(id)) return;
    if (lista.querySelector('[data-foto="' + id + '"]')) return;
    if (cuantasFotos() >= MAX_FOTOS) return;

    var item = document.createElement("li");
    item.setAttribute("data-foto", id);
    item.innerHTML =
      '<img src="/fotos/' +
      id +
      '" alt="Foto del equipo" />' +
      '<button type="button" class="quitar" data-foto-quitar>' +
      '<span aria-hidden="true">×</span>' +
      '<span class="solo-lectores">Quitar foto</span></button>' +
      '<input type="hidden" name="fotos" value="' +
      id +
      '" />';
    lista.appendChild(item);
  }

  async function reducir(archivo) {
    var fuente;
    try {
      // `from-image` aplica la orientación EXIF. Sin esto, las fotos sacadas
      // en vertical con el celular salen acostadas.
      fuente = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    } catch (e) {
      fuente = await createImageBitmap(archivo);
    }

    var escala = Math.min(1, LADO_MAXIMO / Math.max(fuente.width, fuente.height));
    var lienzo = document.createElement("canvas");
    lienzo.width = Math.round(fuente.width * escala);
    lienzo.height = Math.round(fuente.height * escala);
    lienzo.getContext("2d").drawImage(fuente, 0, 0, lienzo.width, lienzo.height);
    fuente.close();

    return await new Promise(function (resolver) {
      lienzo.toBlob(resolver, "image/jpeg", CALIDAD);
    });
  }

  async function subir(archivos) {
    var pendientes = Array.prototype.slice.call(archivos);
    var subidas = 0;

    for (var i = 0; i < pendientes.length; i++) {
      if (cuantasFotos() >= MAX_FOTOS) {
        avisar("Máximo " + MAX_FOTOS + " fotos por orden.");
        break;
      }

      avisar("Subiendo foto " + (i + 1) + " de " + pendientes.length + "…");

      try {
        var comprimida = await reducir(pendientes[i]);
        var respuesta = await fetch("/fotos", {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: comprimida,
        });
        if (!respuesta.ok) throw new Error("respuesta " + respuesta.status);
        var datos = await respuesta.json();
        agregarFoto(datos.id);
        subidas++;
        guardarBorrador();
      } catch (e) {
        avisar("No se pudo subir una foto. Probá de nuevo.");
        return;
      }
    }

    avisar(
      subidas > 0 ? subidas + (subidas === 1 ? " foto lista." : " fotos listas.") : "",
    );
  }

  if (caja && lista && botones && entradaCamara && entradaGaleria) {
    // Los botones arrancan ocultos: sin JS no harían nada, y un botón que no
    // responde es peor que un botón que no está.
    botones.hidden = false;

    formulario.querySelector("[data-foto-camara]").addEventListener("click", function () {
      entradaCamara.click();
    });

    formulario
      .querySelector("[data-foto-galeria]")
      .addEventListener("click", function () {
        entradaGaleria.click();
      });

    [entradaCamara, entradaGaleria].forEach(function (entrada) {
      entrada.addEventListener("change", function () {
        if (entrada.files && entrada.files.length > 0) subir(entrada.files);
        // Se limpia para que sacar dos veces la misma foto vuelva a disparar
        // el evento `change`.
        entrada.value = "";
      });
    });

    lista.addEventListener("click", function (evento) {
      var boton = evento.target.closest("[data-foto-quitar]");
      if (!boton) return;
      boton.closest("[data-foto]").remove();
      avisar("");
      guardarBorrador();
    });
  }

  /* ── 2. Firma ─────────────────────────────────────────────────────────── */

  var cajaFirma = formulario.querySelector("[data-firma]");
  var lienzoFirma = formulario.querySelector("[data-firma-lienzo]");
  var valorFirma = formulario.querySelector("[data-firma-valor]");
  var abrirFirma = formulario.querySelector("[data-firma-abrir]");
  var borrarFirma = formulario.querySelector("[data-firma-borrar]");

  if (cajaFirma && lienzoFirma && valorFirma && abrirFirma && borrarFirma) {
    var pincel = lienzoFirma.getContext("2d");
    var dibujando = false;
    var seTrazo = false;

    var limpiar = function () {
      // Fondo blanco explícito: un PNG transparente se ve como un borrón negro
      // sobre negro cuando se embebe en el comprobante.
      pincel.fillStyle = "#ffffff";
      pincel.fillRect(0, 0, lienzoFirma.width, lienzoFirma.height);
      pincel.strokeStyle = "#0f172a";
      pincel.lineWidth = 2.5;
      pincel.lineCap = "round";
      pincel.lineJoin = "round";
    };

    var ajustar = function () {
      var medida = lienzoFirma.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      lienzoFirma.width = Math.round(medida.width * dpr);
      lienzoFirma.height = Math.round(medida.height * dpr);
      pincel.setTransform(dpr, 0, 0, dpr, 0, 0);
      limpiar();
    };

    var punto = function (evento) {
      var medida = lienzoFirma.getBoundingClientRect();
      return { x: evento.clientX - medida.left, y: evento.clientY - medida.top };
    };

    var volcar = function () {
      valorFirma.value = seTrazo ? lienzoFirma.toDataURL("image/png") : "";
    };

    lienzoFirma.addEventListener("pointerdown", function (evento) {
      evento.preventDefault();
      lienzoFirma.setPointerCapture(evento.pointerId);
      dibujando = true;
      seTrazo = true;
      var p = punto(evento);
      pincel.beginPath();
      pincel.moveTo(p.x, p.y);
      borrarFirma.hidden = false;
    });

    lienzoFirma.addEventListener("pointermove", function (evento) {
      if (!dibujando) return;
      evento.preventDefault();
      var p = punto(evento);
      pincel.lineTo(p.x, p.y);
      pincel.stroke();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (nombre) {
      lienzoFirma.addEventListener(nombre, function () {
        if (!dibujando) return;
        dibujando = false;
        volcar();
      });
    });

    abrirFirma.addEventListener("click", function () {
      cajaFirma.hidden = false;
      abrirFirma.hidden = true;
      // Medir recién con la caja visible: con `hidden` el ancho es 0 y el trazo
      // saldría desplazado respecto del dedo.
      ajustar();
    });

    borrarFirma.addEventListener("click", function () {
      seTrazo = false;
      limpiar();
      volcar();
      borrarFirma.hidden = true;
    });

    // Al volver de un error del servidor la firma ya viene cargada: se muestra
    // el lienzo con el trazo en vez de pedir que firme otra vez.
    if (valorFirma.value.indexOf("data:image/png") === 0) {
      cajaFirma.hidden = false;
      abrirFirma.hidden = true;
      borrarFirma.hidden = false;
      var previa = new Image();
      previa.onload = function () {
        ajustar();
        seTrazo = true;
        pincel.drawImage(previa, 0, 0, lienzoFirma.clientWidth, lienzoFirma.clientHeight);
      };
      previa.src = valorFirma.value;
    }
  }

  /* ── 3. Tarifa de referencia ──────────────────────────────────────────── */

  var servicio = formulario.querySelector("#servicio_id");
  var presupuesto = formulario.querySelector("#presupuesto");

  if (servicio && presupuesto) {
    servicio.addEventListener("change", function () {
      // Solo sugiere: si ya hay un número escrito, no lo pisa. El precio final
      // depende del diagnóstico, no de la lista.
      if (presupuesto.value.trim() !== "") return;
      var elegida = servicio.options[servicio.selectedIndex];
      var tarifa = elegida && elegida.getAttribute("data-tarifa");
      if (tarifa) presupuesto.value = tarifa;
    });
  }

  /* ── 4. Borrador ──────────────────────────────────────────────────────────
     El modo de falla más probable de todo el sistema es que suene el teléfono
     a la mitad de la carga. Al volver, la orden tiene que seguir ahí. */

  var CLAVE = "taller:borrador";
  var aviso = formulario.querySelector("[data-borrador-aviso]");
  var hayErrores = formulario.querySelector(".aviso-error") !== null;

  function guardarBorrador() {
    var deposito = almacen();
    if (!deposito) return;

    var datos = {};
    new FormData(formulario).forEach(function (valor, nombre) {
      // La firma se guarda aparte: es lo único pesado del formulario y
      // reescribirla en cada tecla haría trabajar al disco de más. Las fotos
      // sí entran, porque en el borrador son solo su id.
      if (nombre === "firma") return;
      if (datos[nombre] === undefined) datos[nombre] = [];
      datos[nombre].push(valor);
    });

    try {
      deposito.setItem(CLAVE, JSON.stringify(datos));
      if (aviso) aviso.hidden = false;
    } catch (e) {
      /* Cuota llena: el borrador es un extra, no vale romper la carga. */
    }
  }

  function restaurarBorrador() {
    var deposito = almacen();
    if (!deposito) return;

    var crudo = deposito.getItem(CLAVE);
    if (!crudo) return;

    var datos;
    try {
      datos = JSON.parse(crudo);
    } catch (e) {
      return;
    }

    Object.keys(datos).forEach(function (nombre) {
      var valores = datos[nombre];

      // Las fotos no tienen un campo fijo que rellenar: hay que volver a
      // dibujar la miniatura de cada una.
      if (nombre === "fotos") {
        valores.forEach(agregarFoto);
        return;
      }

      var campos = formulario.querySelectorAll('[name="' + nombre + '"]');
      Array.prototype.forEach.call(campos, function (campo) {
        if (campo.type === "checkbox" || campo.type === "radio") {
          campo.checked = valores.indexOf(campo.value) !== -1;
        } else {
          campo.value = valores[0] || "";
        }
      });
    });

    if (aviso) aviso.hidden = false;
  }

  function olvidarBorrador() {
    var deposito = almacen();
    if (!deposito) return;
    try {
      deposito.removeItem(CLAVE);
    } catch (e) {
      /* nada que hacer */
    }
  }

  // Con errores del servidor, lo que está en pantalla ya es lo que se tipeó:
  // pisarlo con el borrador solo puede empeorarlo.
  if (!hayErrores) restaurarBorrador();

  var pendiente = null;
  formulario.addEventListener("input", function () {
    clearTimeout(pendiente);
    pendiente = setTimeout(guardarBorrador, 400);
  });
  formulario.addEventListener("change", guardarBorrador);
  formulario.addEventListener("submit", olvidarBorrador);
})();
