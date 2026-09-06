#!/usr/bin/env bash
# Genera las capturas de SGRC que muestra la galería de la sección Proyectos.
#
# Entrada: el directorio docs/capturas del repo de SGRC (PNG de página
# completa de un viewport de 1440 px a DPR 2; el del teléfono, de 390 px a
# DPR 3). Salida: src/assets/capturas y src/data/medidas.json.
#
# Cada pantalla sale en tres versiones, porque una sola no sirve para los tres
# lugares donde se la mira:
#
#   completa → la lupa. La página entera, para quien quiera el contexto.
#   detalle  → la tarjeta en escritorio. Un recorte de ~2100 px de ancho que,
#              servido a los 1056 px de la tarjeta, deja el texto del sistema
#              a tamaño real.
#   foco     → la tarjeta en el teléfono. Un recorte de 700 a 1200 px: un solo
#              elemento de la interfaz, porque a 390 px de ancho no entra
#              legible nada más grande.
#
# La página entera metida en la tarjeta era ilegible: 2880 px de ancho en
# 1056 dejan el texto de 14 px en 10, y en un teléfono de 390 lo dejan en 3.
#
# Cada versión sale en tres formatos y dos anchos: avif y webp arman el srcSet
# real, y un jpg queda de respaldo para el navegador que no entienda ninguno de
# los dos —no vale la pena un srcSet completo en el formato que casi nadie
# recibe.
#
# Requiere ffmpeg con libaom-av1 y libwebp. No requiere Node.
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
rm -f "$out"/*.avif "$out"/*.webp "$out"/*.jpg

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
# `x:y:ancho:alto` en píxeles del PNG original. Los dos recortes van en 16:10,
# que es el marco de la tarjeta: así el `object-fit: cover` del CSS no tiene
# nada que cortar y lo que se ve es exactamente lo que se eligió acá.
#
# El detalle enmarca el bloque que sostiene el pie de la captura; el foco, la
# pieza más chica que todavía prueba lo mismo. Cuando el recorte es más angosto
# que la tarjeta la imagen se agranda, y eso es a propósito: en una pantalla
# con mucho aire —mis reservas, por ejemplo— agrandar es preferible a mostrar
# el vacío de la página.
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
  [01-mostrador]="1460:560:700:437"        # "10 de 11 equipos"
  [02-nueva-reserva]="704:1030:700:437"    # las computadoras tildadas
  [03-mis-reservas]="520:400:944:590"      # las dos clases, con sus computadoras
  [10-inventario-docente]="520:520:900:562" # estado, freezada y software de cada PC
  [04-inventario-admin]="560:830:980:612"  # la ficha de la notebook suelta
  [08-academico]="560:1160:900:562"        # las materias de 1°A con sus docentes
  [07-licencias]="320:460:900:562"         # cuatro licencias sin fecha de vencimiento
  [05-reportes]="560:1200:840:525"         # las horas reservadas por docente
  [09-reportes-oscuro]="560:1200:840:525"  # lo mismo, en oscuro
)

# El teléfono no es una página ancha: en escritorio entra como tríptico de tres
# tramos de la misma pantalla, que llena el marco 16:10 en vez de dejar dos
# franjas vacías a los costados. En un teléfono, en cambio, mostrar un teléfono
# en tres columnas diminutas no tiene sentido: ahí va una franja de la pantalla
# de verdad, a tamaño real.
foco["11-movil"]="0:1640:1170:731"

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
  encode_recorte "$src/$slide.png" "$slide-foco" "${foco[$slide]}" mitad nativo
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
