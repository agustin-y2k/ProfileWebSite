#!/usr/bin/env bash
# Genera las capturas de SGRC que muestra la galería de la sección Proyectos.
#
# Entrada: el directorio docs/capturas del repo de SGRC (PNG de página
# completa, 2880px de ancho en escritorio). Salida: src/assets/capturas.
#
# Cada captura sale en tres formatos y dos anchos. La galería recorta la franja
# superior por CSS (object-fit: cover) y la lupa muestra la misma imagen
# entera, así que un único juego de archivos sirve a los dos usos.
#
#   avif/webp 900 y 1800  → el srcSet real; 1800 cubre la tarjeta en pantallas
#                           densas y la lupa en escritorio.
#   jpg 1200              → un solo respaldo para el navegador que no entienda
#                           ninguno de los dos; no vale la pena un srcSet
#                           completo en el formato que casi nadie recibe.
#
# Requiere ffmpeg con libaom-av1 y libwebp. No requiere Node.
set -euo pipefail

src="${1:-}"
if [[ -z "$src" || ! -d "$src" ]]; then
  echo "uso: $0 <ruta a sgrc/docs/capturas>" >&2
  exit 1
fi

out="$(cd "$(dirname "$0")/.." && pwd)/src/assets/capturas"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out"

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

# El teléfono no es una página ancha: entra como tríptico de tres tramos de la
# misma pantalla, que llena el marco 16:10 de la galería en vez de dejar dos
# franjas vacías a los costados.
tryptich() {
  local input="$1" dest="$2"

  # El último tramo se cuelga del pie de la página en vez de llevar un corte
  # fijo: la pantalla del teléfono crece cuando se le agrega una acción más al
  # menú, y con un número escrito a mano el tramo terminaba cortando el pie por
  # la mitad.
  local alto
  alto=$(ffprobe -v error -select_streams v:0 -show_entries stream=height \
    -of csv=p=0 "$input")

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

encode() {
  local input="$1" name="$2"

  for w in 900 1800; do
    # yuv444p: las capturas son texto sobre fondo claro, y el submuestreo de
    # croma de 4:2:0 ensucia el borde de las letras de color.
    ffmpeg -v error -y -i "$input" -vf "scale=$w:-2:flags=lanczos" \
      -c:v libaom-av1 -still-picture 1 -crf 30 -cpu-used 4 \
      -pix_fmt yuv444p "$out/$name-$w.avif"
    ffmpeg -v error -y -i "$input" -vf "scale=$w:-2:flags=lanczos" \
      -c:v libwebp -quality 82 -compression_level 6 "$out/$name-$w.webp"
  done

  ffmpeg -v error -y -i "$input" -vf "scale=1200:-2:flags=lanczos" \
    -q:v 4 "$out/$name-1200.jpg"
}

for slide in "${slides[@]}"; do
  echo "→ $slide"
  encode "$src/$slide.png" "$slide"
done

echo "→ 11-movil (tríptico)"
tryptich "$src/11-movil.png" "$tmp/11-movil.png"
encode "$tmp/11-movil.png" "11-movil"

echo "listo: $(ls -1 "$out" | wc -l) archivos en $out"
