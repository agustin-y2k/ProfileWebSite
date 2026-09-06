#!/usr/bin/env bash
# Genera las capturas de SGRC que muestra la galería de la sección Proyectos.
#
# Entrada: el directorio docs/capturas del repo de SGRC. De cada pantalla hay
# dos PNG de página completa: el de escritorio, de un viewport de 1440 px a
# DPR 2, y el del teléfono —`-movil`—, de 390 px a DPR 3. Salida:
# src/assets/capturas y src/data/medidas.json.
#
# Cada pantalla sale en tres versiones, porque una sola no sirve para los tres
# lugares donde se la mira:
#
#   completa → la lupa. La página entera, para quien quiera el contexto.
#   detalle  → la tarjeta en escritorio. Un recorte de ~2100 px de ancho que,
#              servido a los 1056 px de la tarjeta, deja el texto del sistema
#              a tamaño real.
#   foco     → la tarjeta en el teléfono. Una franja de la captura del
#              teléfono, servida a tamaño real. Sale de esa captura y no de un
#              recorte de la de escritorio porque no son la misma interfaz: en
#              390 px las tablas del sistema se vuelven tarjetas y los botones
#              crecen, y recortar la de escritorio mostraba una tabla cortada
#              al medio donde el teléfono muestra una tarjeta entera.
#
# La página entera metida en la tarjeta era ilegible: 2880 px de ancho en
# 1056 dejan el texto de 14 px en 10, y en un teléfono de 390 lo dejan en 3.
#
# Cada versión sale en tres formatos y dos anchos: avif y webp arman el srcSet
# real, y un jpg queda de respaldo para el navegador que no entienda ninguno de
# los dos —no vale la pena un srcSet completo en el formato que casi nadie
# recibe.
#
# Del mismo directorio sale también el clip del flujo de reserva —reserva.webm,
# que graba docs/guias/generar/grabar-reserva.mjs—, y acá se lo recorta, se lo
# acelera y se lo pasa a los dos formatos que hacen falta.
#
# Requiere ffmpeg con libaom-av1, libwebp, libvpx-vp9 y libx264. No requiere
# Node.
set -euo pipefail

src="${1:-}"
if [[ -z "$src" || ! -d "$src" ]]; then
  echo "uso: $0 <ruta a sgrc/docs/capturas>" >&2
  exit 1
fi

raiz="$(cd "$(dirname "$0")/.." && pwd)"
out="$raiz/src/assets/capturas"
medidas="$raiz/src/data/medidas.json"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out"

# El directorio se vacía antes de escribir: si un recorte cambia de ancho, el
# archivo del ancho viejo quedaría suelto y el glob de capturas.ts lo metería
# igual en el srcSet, ofreciéndole al navegador un archivo con las medidas de
# otro recorte.
rm -f "$out"/*.avif "$out"/*.webp "$out"/*.jpg "$out"/*.webm "$out"/*.mp4

# Las que entran a la galería, en el orden en que se muestran. El resto de
# docs/capturas queda afuera a propósito: el login y la pantalla de entregas
# vacía no venden nada.
slides=(
  01-mostrador
  02-nueva-reserva
  03-mis-reservas
  10-inventario-docente
  04-inventario-admin
  08-academico
  07-licencias
  05-reportes
  09-reportes-oscuro
)

# ── Qué se recorta de cada pantalla ─────────────────────────────────────────
# `x:y:ancho:alto` en píxeles del PNG del que sale cada uno. Cada recorte va en
# la proporción del marco que lo va a mostrar —16:10 el detalle, 4:3 el foco—,
# así el `object-fit: cover` del CSS no tiene nada que cortar y lo que se ve es
# exactamente lo que se eligió acá.
#
# El detalle enmarca el bloque que sostiene el pie de la captura. Cuando es más
# angosto que la tarjeta la imagen se agranda, y eso es a propósito: en una
# pantalla con mucho aire —mis reservas, por ejemplo— agrandar es preferible a
# mostrar el vacío de la página.
#
# El foco es una franja de ancho completo de la captura del teléfono: ahí lo
# único que hay que elegir es a qué altura empieza. Va más alto que el detalle
# —4:3 y no 16:10— porque la fuente es una pantalla vertical: una franja 16:10
# de un teléfono muestra menos de un tercio de lo que se ve al entrar.
declare -A detalle=(
  [01-mostrador]="320:140:2240:1400"          # el saludo, las cuatro tarjetas y los contadores
  [02-nueva-reserva]="384:380:2112:1320"      # el formulario entero, de la materia a las computadoras
  [03-mis-reservas]="500:120:1840:1150"       # el título y las dos clases con sus botones
  [10-inventario-docente]="480:140:1900:1187" # la tabla del carro, de PC 1 a PC 8
  [04-inventario-admin]="480:600:1900:1187"   # los equipos sueltos y el arranque del carro
  [08-academico]="480:680:1900:1187"          # el ciclo activo, el alta de curso y las materias
  [07-licencias]="300:120:2280:1425"          # el listado con los plazos de renovación
  [05-reportes]="480:440:1900:1187"           # uso por equipo y horas por docente
  [09-reportes-oscuro]="480:440:1900:1187"    # el mismo bloque, en oscuro
)

declare -A foco=(
  [01-mostrador]="0:1900:1170:878"         # el laboratorio ahora y la entrega sin reserva
  [02-nueva-reserva]="0:1970:1170:878"     # las computadoras del carro, para tildar
  [03-mis-reservas]="0:850:1170:878"       # la clase del lunes con sus computadoras
  [10-inventario-docente]="0:725:1170:878" # la ficha de la PC 1 del carro
  [04-inventario-admin]="0:1800:1170:878"  # la notebook suelta, con todas sus acciones
  [08-academico]="0:1550:1170:878"         # división y modalidad, las dos opcionales
  [07-licencias]="0:950:1170:878"          # tres licencias sin fecha de vencimiento
  [05-reportes]="0:1160:1170:878"          # el uso por equipo, con su total
  [09-reportes-oscuro]="0:1160:1170:878"   # lo mismo, en oscuro
)

# El inicio del docente ya es una captura de teléfono, así que no tiene un
# `-movil` aparte: su detalle y su foco salen los dos del mismo archivo. En
# escritorio entra como tríptico de tres tramos, que llena el marco 16:10 en
# vez de dejar dos franjas vacías a los costados; en un teléfono, mostrar un
# teléfono en tres columnas diminutas no tendría sentido, y va una franja
# derecha de la pantalla.
foco["11-movil"]="0:1620:1170:878"

alto_de() {
  ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$1"
}

ancho_de() {
  ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$1"
}

tryptich() {
  local input="$1" dest="$2"

  # El último tramo se cuelga del pie de la página en vez de llevar un corte
  # fijo: la pantalla del teléfono crece cuando se le agrega una acción más al
  # menú, y con un número escrito a mano el tramo terminaba cortando el pie por
  # la mitad.
  local alto
  alto=$(alto_de "$input")

  ffmpeg -v error -y -i "$input" -filter_complex "
    color=c=0xF8FAFD:s=4004x2502[bg];
    [0:v]crop=1170:2262:0:0[p1];
    [0:v]crop=1170:2262:0:1650[p2];
    [0:v]crop=1170:2262:0:$((alto - 2262))[p3];
    [bg]drawbox=x=122:y=118:w=1174:h=2266:color=0xDDE3EC:t=2,
        drawbox=x=1415:y=118:w=1174:h=2266:color=0xDDE3EC:t=2,
        drawbox=x=2708:y=118:w=1174:h=2266:color=0xDDE3EC:t=2[marco];
    [marco][p1]overlay=124:120[a];
    [a][p2]overlay=1417:120[b];
    [b][p3]overlay=2710:120
  " -frames:v 1 "$dest"
}

recortar() {
  local input="$1" region="$2" dest="$3"
  local x y w h
  IFS=: read -r x y w h <<<"$region"
  ffmpeg -v error -y -i "$input" -vf "crop=$w:$h:$x:$y" -frames:v 1 "$dest"
}

# encode <origen> <nombre> <ancho del jpg> <anchos del srcSet...>
encode() {
  local input="$1" name="$2" jpg="$3"
  shift 3

  for w in "$@"; do
    # yuv444p: las capturas son texto sobre fondo claro, y el submuestreo de
    # croma de 4:2:0 ensucia el borde de las letras de color.
    ffmpeg -v error -y -i "$input" -vf "scale=$w:-2:flags=lanczos" \
      -c:v libaom-av1 -still-picture 1 -crf 30 -cpu-used 4 \
      -pix_fmt yuv444p "$out/$name-$w.avif"
    ffmpeg -v error -y -i "$input" -vf "scale=$w:-2:flags=lanczos" \
      -c:v libwebp -quality 82 -compression_level 6 "$out/$name-$w.webp"
  done

  ffmpeg -v error -y -i "$input" -vf "scale=$jpg:-2:flags=lanczos" \
    -q:v 4 "$out/$name-$jpg.jpg"
}

# encode_recorte <origen> <nombre> <región> <anchos...>, donde un ancho puede
# escribirse `nativo` —el del recorte, sin escalar— o `mitad`. El primero de la
# lista es también el del jpg de respaldo.
encode_recorte() {
  local input="$1" name="$2" region="$3"
  shift 3

  local nativo
  nativo=$(cut -d: -f3 <<<"$region")

  local anchos=()
  for pedido in "$@"; do
    case "$pedido" in
      nativo) anchos+=("$nativo") ;;
      mitad) anchos+=("$((nativo / 2))") ;;
      *) anchos+=("$pedido") ;;
    esac
  done

  recortar "$input" "$region" "$tmp/$name.png"
  encode "$tmp/$name.png" "$name" "${anchos[0]}" "${anchos[@]}"
}

# Las medidas reales de cada archivo, que la galería usa para reservar el hueco
# de la imagen antes de que cargue. Se generan y no se escriben a mano: cuando
# una pantalla crecía, el número escrito en el TypeScript quedaba viejo y la
# lupa reservaba un hueco del tamaño equivocado.
fichas=()

anotar() {
  local id="$1" completa="$2"
  local ancho alto
  ancho=$(ancho_de "$completa")
  alto=$(alto_de "$completa")
  fichas+=("  \"$id\": {
    \"completa\": [$ancho, $alto],
    \"detalle\": [$(cut -d: -f3 <<<"${detalle[$id]}"), $(cut -d: -f4 <<<"${detalle[$id]}")],
    \"foco\": [$(cut -d: -f3 <<<"${foco[$id]}"), $(cut -d: -f4 <<<"${foco[$id]}")]
  }")
}

# ── El clip del flujo de reserva ────────────────────────────────────────────
# Playwright graba a paso real y el video arranca con el navegador cargando la
# página: se corta ese arranque en blanco y se lo acelera un poco, que es lo
# que hace cualquier demo grabada. Quedan quince segundos, que es lo que puede
# durar una vuelta del bucle sin cansar.
#
# Van dos formatos porque no hay uno que sirva en todos lados: VP9 en webm pesa
# la mitad, y el h264 en mp4 lo entiende cualquier cosa. El <video> los ofrece
# en ese orden y el navegador se queda con el primero que sabe leer.
#
# El póster es lo que se ve antes de que arranque: un cuadro del medio, con el
# formulario completo y dos computadoras ya tildadas. Del final no, que es el
# resultado y adelantarlo le saca la gracia.
clip() {
  local input="$1"
  if [[ ! -f "$input" ]]; then
    echo "→ sin reserva.webm: el clip queda como estaba"
    return
  fi

  echo "→ reserva (clip)"
  local paso="setpts=PTS/1.45"

  ffmpeg -v error -y -ss 0.7 -i "$input" -vf "$paso" -an \
    -c:v libvpx-vp9 -crf 30 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 \
    -pix_fmt yuv420p "$out/reserva-1280.webm"

  ffmpeg -v error -y -ss 0.7 -i "$input" -vf "$paso" -an \
    -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart \
    "$out/reserva-1280.mp4"

  ffmpeg -v error -y -ss 15 -i "$input" -frames:v 1 -q:v 4 \
    "$out/reserva-poster.jpg"
}

for slide in "${slides[@]}"; do
  echo "→ $slide"
  encode "$src/$slide.png" "$slide" 1200 900 1800
  # La tarjeta no pasa de 1056 px de ancho: el detalle sale en ese ancho, que
  # es el que pide una pantalla común, y en el nativo del recorte, que es el
  # que pide una densa. Servirlo solo en nativo mandaría dos megapíxeles de
  # más a cada visitante con una pantalla de las de siempre.
  encode_recorte "$src/$slide.png" "$slide-detalle" "${detalle[$slide]}" 1056 nativo
  # El foco lo mira un teléfono: su nativo ya es chico, y la mitad alcanza
  # donde la pantalla no es densa.
  # El foco lo mira un teléfono: su nativo ya es chico —1170 px, que son los
  # 390 de la pantalla a DPR 3— y la mitad alcanza donde la pantalla no es
  # densa.
  encode_recorte "$src/$slide-movil.png" "$slide-foco" "${foco[$slide]}" mitad nativo
  anotar "$slide" "$src/$slide.png"
done

echo "→ 11-movil (tríptico y franja)"
tryptich "$src/11-movil.png" "$tmp/11-movil.png"
encode "$tmp/11-movil.png" "11-movil" 1200 900 1800
# El tríptico ya está armado en 16:10: en escritorio el detalle es el tríptico
# entero, sin recortar de nuevo.
encode "$tmp/11-movil.png" "11-movil-detalle" 1056 1056 2002
encode_recorte "$src/11-movil.png" "11-movil-foco" "${foco["11-movil"]}" mitad nativo
detalle["11-movil"]="0:0:4004:2502"
anotar "11-movil" "$tmp/11-movil.png"

clip "$src/reserva.webm"

{
  echo "{"
  for i in "${!fichas[@]}"; do
    printf '%s' "${fichas[$i]}"
    (( i < ${#fichas[@]} - 1 )) && echo "," || echo
  done
  echo "}"
} > "$medidas"

echo "listo: $(ls -1 "$out" | wc -l) archivos en $out"
echo "       medidas en $medidas"
