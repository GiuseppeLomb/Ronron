// Ronron: a personagem da app (desenho próprio em SVG, só curvas). Homenagem a um gato muito querido.
// ===================== Ronron v3: cabeça minimal + bigodes + pelo felpudo; desenho só em curvas =====================
const mirX = (d, cx2) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m,x,y) => (cx2 - +x) + ' ' + y);
const B = (d, cls) => `<path class="${cls}" d="${d}"/>`;
const BM = (d, cls) => B(d, cls) + B(mirX(d, 240), cls);           // corpo: espelho em x=120
const HM = (d, cls) => B(d, cls) + B(mirX(d, 200), cls);           // cabeça: espelho em x=100
const HEAD = {
  earL:'M33 86 C 28 62 31 36 40 22 C 44 16 50 15 55 20 C 67 32 78 44 85 54 C 68 60 48 70 33 86 Z',
  inL:'M43 72 C 41 56 43 40 48 32 C 55 39 63 47 68 55 C 59 59 50 64 43 72 Z',
  earTuft:'M46 60 C 50 57 55 58 58 62 M48 50 C 52 48 57 50 59 54',
  tuft:'M88 44 C 88 34 94 27 99 33 C 102 25 112 28 111 41 C 104 37 95 38 88 44 Z',
  head:'M100 40 C 142 40 172 56 175 92 C 184 96 190 105 184 113 C 192 119 188 131 178 134 C 170 158 140 171 100 171 C 60 171 30 158 22 134 C 12 131 8 119 16 113 C 10 105 16 96 25 92 C 28 56 58 40 100 40 Z',
  shade:'M20 130 C 30 156 62 170 100 170 C 138 170 170 156 180 130 C 166 152 136 161 100 161 C 64 161 34 152 20 130 Z',
  M:'M84 66 C 88 58 92 58 95 64 M100 57 L100 66 M105 64 C 108 58 112 58 116 66',
  muzzle:'M76 134 C 76 124 88 120 100 124 C 112 120 124 124 124 134 C 124 145 112 151 100 149 C 88 151 76 145 76 134 Z',
  blushL:'M33 130 C 37 122 54 122 58 130 C 54 137 37 137 33 130 Z',
  eyeL:'M70 88 C 84 88 93 100 93 114 C 93 128 83 137 70 137 C 57 137 47 128 47 114 C 47 100 56 88 70 88 Z',
  pupL:'M70 97 C 77 97 81 105 81 114 C 81 123 77 129 70 129 C 63 129 59 123 59 114 C 59 105 63 97 70 97 Z',
  hl1L:'M61 99 C 65 96 70 98 69 103 C 68 107 63 108 60 106 C 58 104 58 101 61 99 Z',
  hl2L:'M78 118 C 80 116 83 117 83 120 C 83 122 80 123 78 122 C 77 121 77 119 78 118 Z',
  lidL:'M45 114 C 45 96 56 86 70 86 C 84 86 95 96 95 114 C 86 108 56 108 45 114 Z',
  happyL:'M52 118 C 58 104 82 104 88 118', closedL:'M52 112 C 58 122 82 122 88 112',
  browL:'M52 86 C 60 82 70 79 80 76',
  browUpL:'M56 80 C 62 74 72 73 80 76',
  softL:'M53 115 C 61 107 79 107 87 115',
  nose:'M95 128 C 97 125 103 125 105 128 C 104 131 102 133 100 133 C 98 133 96 131 95 128 Z',
  mouthW:'M89 137 C 91 141 96 141 100 137 C 104 141 109 141 111 137',
  mouthO:'M90 136 C 92 148 108 148 110 136 C 104 139 96 139 90 136 Z',
  tongue:'M95 142 C 97 146 103 146 105 142 C 102 140 98 140 95 142 Z',
  yawn:'M92 136 C 92 128 108 128 108 136 C 108 150 92 150 92 136 Z',
  whisk:'M40 141 C 31 141 25 143 20 146 M40 134 C 32 132 26 132 20 133',
};
const HEAD_SVG = `
 <g data-part="ears" data-val="on">${HM(HEAD.earL,'f fur')}${HM(HEAD.inL,'ear')}${B(HEAD.earTuft+' '+mirX(HEAD.earTuft,200),'tuftln dt')}</g>
 ${B(HEAD.tuft,'f fur')}
 ${B(HEAD.head,'f fur')}
 ${B(HEAD.shade,'shade dt')}
 ${B(HEAD.M,'stripe')}
 ${B(HEAD.muzzle,'cream dt')}
 ${HM(HEAD.blushL,'blush dt')}
 <g data-part="eyes" data-val="open"><g class="blink">${HM(HEAD.eyeL,'f iris eyeo')}<g class="pupils">${HM(HEAD.pupL,'pupil')}${HM(HEAD.hl1L,'hl')}${HM(HEAD.hl2L,'hl dt')}</g></g>
   <g data-part="lids" data-val="on" class="lids">${HM(HEAD.lidL,'f fur')}</g></g>
 <g data-part="eyes" data-val="happy">${B(HEAD.happyL+' '+mirX(HEAD.happyL,200),'ln eyeln')}</g>
 <g data-part="eyes" data-val="closed">${B(HEAD.closedL+' '+mirX(HEAD.closedL,200),'ln eyeln')}</g>
 <g data-part="brows" data-val="on">${B(HEAD.browL+' '+mirX(HEAD.browL,200),'ln thin')}</g>
 <g data-part="brows" data-val="up">${B(HEAD.browUpL+' '+mirX(HEAD.browUpL,200),'ln thin dt')}</g>
 <g data-part="eyes" data-val="soft">${B(HEAD.softL+' '+mirX(HEAD.softL,200),'ln eyeln')}</g>
 ${B(HEAD.nose,'f nose')}
 <g data-part="mouth" data-val="w">${B(HEAD.mouthW,'ln mid')}</g>
 <g data-part="mouth" data-val="smile">${B('M88 136 C 92 143 98 143 100 138 C 102 143 108 143 112 136','ln mid')}</g>
 <g data-part="mouth" data-val="open">${B(HEAD.mouthO,'f mouth')}${B(HEAD.tongue,'tongue')}</g>
 <g data-part="mouth" data-val="yawn">${B(HEAD.yawn,'f mouth')}${B(HEAD.tongue.replace(/14(\d)/g,(m,a)=>'14'+a),'tongue')}</g>
 ${B(HEAD.whisk+' '+mirX(HEAD.whisk,200),'ln whisk dt')}`;

// ---------- corpos (viewBox 240 x 290; chão a y = 282) ----------
const PAW_TOES = (x,y) => `M${x-5} ${y} C ${x-5} ${y+3} ${x-5} ${y+4} ${x-5} ${y+6} M${x+3} ${y} C ${x+3} ${y+3} ${x+3} ${y+4} ${x+3} ${y+6}`;
const SIT = {
  tail:'M168 262 C 204 266 226 248 228 220 C 230 200 222 186 230 172 C 236 162 250 166 248 178 C 246 188 238 192 238 208 C 238 246 214 278 170 280 Z',
  tailTip:'M230 172 C 236 162 250 166 248 178 C 247 184 242 188 239 192 C 234 186 228 180 230 172 Z',
  tailRings:'M226 226 C 232 228 236 230 238 234 M220 248 C 226 250 230 254 232 258 M204 266 C 208 270 210 274 210 278',
  feetL:'M44 270 C 44 258 62 254 78 258 C 90 261 92 274 80 278 C 66 283 44 282 44 270 Z',
  body:'M72 168 C 52 188 44 228 52 256 C 58 278 90 284 120 284 C 150 284 182 278 188 256 C 196 228 188 188 168 168 C 150 158 90 158 72 168 Z',
  bodyShadeL:'M54 236 C 58 266 84 280 108 282 C 88 274 66 260 54 236 Z',
  belly:'M96 182 C 86 206 88 248 98 276 C 110 282 130 282 142 276 C 152 248 154 206 144 182 C 132 188 108 188 96 182 Z',
  sideStripesL:'M58 206 C 66 204 72 206 76 212 M54 226 C 62 224 68 226 72 232',
  ruff:'M82 166 C 90 178 98 170 104 182 C 110 172 116 180 120 172 C 124 180 130 172 136 182 C 142 170 150 178 158 166 C 140 158 100 158 82 166 Z',
  legL:'M90 200 C 82 224 82 256 86 272 C 90 284 110 284 112 272 C 114 254 112 224 108 202 C 104 194 94 194 90 200 Z',
  pawL:'M84 268 C 86 260 110 260 112 268 C 112 282 86 284 84 268 Z',
  legStripeL:'M88 222 C 94 224 100 224 106 222 M87 240 C 93 242 100 242 107 240',
};
const GENTE = {
  body:'M70 160 C 54 176 48 214 58 242 C 68 266 100 274 120 274 C 140 274 172 266 182 242 C 192 214 186 176 170 160 C 152 150 88 150 70 160 Z',
  bodyShadeL:'M58 230 C 64 256 88 270 110 272 C 90 262 70 250 58 230 Z',
  belly:'M84 198 C 84 170 156 170 156 198 C 162 232 150 262 120 266 C 90 262 78 232 84 198 Z',
  sideStripesL:'M56 196 C 64 194 70 196 74 202 M54 216 C 62 214 68 216 72 222',
  ruff:'M80 162 C 88 174 96 166 102 178 C 108 168 114 176 120 168 C 126 176 132 168 138 178 C 144 166 152 174 160 162 C 140 154 100 154 80 162 Z',
  legL:'M86 222 C 70 230 50 242 32 252 C 18 260 14 276 30 278 C 48 280 74 266 98 256 C 108 250 102 216 86 222 Z',
  legStripeL:'M64 240 C 66 246 66 252 64 258 M48 248 C 50 254 50 260 48 266',
  footL:'M6 262 C 2 246 20 238 32 246 C 41 254 39 274 26 278 C 15 281 8 273 6 262 Z',
  padsL:'M14 266 C 14 259 28 259 28 266 C 28 272 14 272 14 266 Z M10 254 C 10 250 15 250 15 254 C 15 257 10 257 10 254 Z M17 249 C 17 245 22 245 22 249 C 22 252 17 252 17 249 Z M25 251 C 25 247 30 247 30 251 C 30 254 25 254 25 251 Z',
  // cauda atrás do corpo, a subir pelo lado direito com a ponta enrolada (nunca entre as pernas)
  tail:'M176 248 C 194 246 206 236 210 220 C 214 206 212 192 204 186 C 198 181 190 184 193 192 C 197 202 197 212 193 222 C 189 232 182 236 172 236 Z',
  tailRings:'M195 210 C 200 212 206 212 211 209 M193 225 C 198 228 203 228 208 225',
  tailTip:'M204 186 C 198 181 190 184 193 192 C 194 196 197 199 202 199 C 207 198 211 196 211 193 C 210 190 207 188 204 186 Z',
  armL:'M88 180 C 82 198 86 218 98 232 C 102 236 106 238 110 236 C 104 222 100 204 100 186 C 98 176 90 174 88 180 Z',
  handL:'M97 232 C 98 222 114 223 117 231 C 120 243 113 252 105 250 C 99 248 96 240 97 232 Z',
  fingersL:'M103 246 C 103 248 104 250 105 251 M109 245 C 109 248 110 250 111 251',
};
const CURL = {
  tail:'M210 252 C 224 276 190 290 140 290 C 100 290 70 288 48 282 C 40 280 42 270 50 271 C 72 276 104 278 138 278 C 176 278 200 270 196 254 Z',
  tailTip:'M48 282 C 38 280 40 268 50 271 C 54 273 56 280 48 282 Z',
  body:'M28 260 C 22 216 64 188 126 188 C 188 188 222 216 216 252 C 214 270 192 278 170 278 L 54 278 C 36 278 29 272 28 260 Z',
  shade:'M40 262 C 60 276 120 278 200 266 C 190 276 170 278 150 278 L 54 278 C 46 278 40 270 40 262 Z',
  stripes:'M112 194 C 116 204 116 214 112 224 M136 192 C 140 202 140 212 136 222 M160 196 C 164 206 164 216 160 226 M184 206 C 186 214 186 220 184 228',
  paws:'M58 270 C 58 262 76 260 82 266 C 86 274 62 278 58 270 Z M84 274 C 84 266 102 264 106 270 C 108 278 88 280 84 274 Z',
};
const STRETCH = {
  tail:'M212 168 C 224 142 230 112 222 84 C 220 74 234 70 238 80 C 246 110 240 148 226 176 Z',
  tailTip:'M222 84 C 220 74 234 70 238 80 C 239 85 240 90 240 95 C 233 93 226 90 222 84 Z',
  tailRings:'M224 120 C 230 121 235 123 238 126 M224 142 C 229 144 233 147 235 151',
  rear2:'M174 206 C 170 230 172 260 174 274 C 176 286 192 286 192 274 C 192 256 192 230 190 210 Z',
  rear1:'M192 198 C 188 224 190 256 194 272 C 196 284 212 284 212 272 C 212 252 212 224 210 202 Z',
  body:'M50 232 C 48 214 66 202 90 200 C 128 196 162 176 188 160 C 210 148 232 160 228 184 C 224 206 206 214 190 216 C 160 222 122 242 92 252 C 70 258 52 250 50 232 Z',
  belly:'M90 248 C 122 238 158 222 196 214 C 186 220 160 228 128 240 C 112 246 100 250 92 252 Z',
  stripes:'M118 204 C 122 212 122 220 118 228 M140 194 C 144 202 144 210 140 218 M162 182 C 166 190 166 198 162 206 M184 170 C 188 178 188 186 184 194',
  front2:'M84 248 C 62 256 38 262 18 264 C 6 266 6 280 18 280 C 42 278 68 272 96 262 Z',
  front1:'M72 238 C 52 246 30 252 12 254 C 0 256 0 270 12 270 C 36 268 60 262 86 252 Z',
  paws:'M2 262 C 0 254 12 250 18 256 C 22 264 8 270 2 262 Z M8 272 C 6 264 18 260 24 266 C 28 274 14 280 8 272 Z M194 276 C 194 268 212 268 212 276 C 212 284 194 284 194 276 Z M174 278 C 174 270 192 270 192 278 C 192 286 174 286 174 278 Z',
  ruff:'M58 204 C 66 214 72 206 78 216 C 84 206 90 214 96 204 C 84 198 68 198 58 204 Z',
};
const ARMS = {
  wave:'M148 196 C 164 182 176 160 180 138 C 182 128 196 130 194 142 C 190 166 176 192 158 208 Z',
  wavePaw:'M178 138 C 174 126 188 118 196 126 C 202 134 196 144 188 144 C 184 144 180 142 178 138 Z',
  chin:'M150 200 C 170 190 172 172 158 162 C 152 158 144 160 144 168 C 152 174 154 186 140 194 Z',
  chinPaw:'M132 166 C 130 156 146 152 152 160 C 156 168 146 174 138 172 C 134 171 132 169 132 166 Z',
  upL:'M90 196 C 74 180 62 158 58 136 C 56 126 42 128 44 140 C 48 164 62 190 80 208 Z',
  upPawL:'M40 136 C 36 124 50 118 58 124 C 64 132 58 144 50 144 C 44 144 41 140 40 136 Z',
  coverL:'M92 202 C 78 186 76 162 84 146 C 88 140 98 142 98 150 C 96 164 100 182 106 196 Z',
  coverPawL:'M70 124 C 68 108 90 102 104 110 C 114 116 112 134 98 138 C 86 142 72 136 70 124 Z',
  holdL:'M90 198 C 80 214 80 232 90 240 C 96 244 102 238 98 232 C 92 224 94 212 102 202 Z',
  holdPawL:'M86 236 C 84 228 96 224 100 232 C 102 240 90 244 86 236 Z',
  frameL:'M88 196 C 78 204 72 214 74 224 C 76 230 84 230 84 224 C 84 216 90 208 98 204 Z',
  framePawL:'M66 222 C 64 212 78 208 84 216 C 88 224 80 232 72 230 C 68 229 66 226 66 222 Z',
};
const PROPS = {
  book:'M80 214 C 96 208 110 210 120 218 C 130 210 144 208 160 214 L 160 248 C 144 242 130 244 120 252 C 110 244 96 242 80 248 Z',
  bookLines:'M120 218 C 120 230 120 240 120 252 M88 222 C 96 220 104 221 112 224 M88 230 C 96 228 104 229 112 232 M128 224 C 136 221 144 220 152 222 M128 232 C 136 229 144 228 152 230',
  yarn:'M120 206 C 136 206 146 218 146 232 C 146 246 134 256 120 256 C 104 256 94 246 94 232 C 94 218 104 206 120 206 Z',
  yarnLines:'M100 222 C 112 214 130 216 142 226 M98 240 C 112 248 132 246 144 236 M112 208 C 120 222 118 240 110 254 M130 208 C 124 224 126 240 134 254 M146 238 C 166 258 190 244 208 266 M94 240 C 74 260 54 250 34 270',
  photo:'M78 194 C 78 189 82 186 87 186 L 153 186 C 158 186 162 189 162 194 L 162 248 C 162 253 158 256 153 256 L 87 256 C 82 256 78 253 78 248 Z',
  photoIn:'M88 196 L 152 196 C 153 196 152 196 152 197 L 152 244 C 152 245 152 246 151 246 L 89 246 C 88 246 88 245 88 244 L 88 197 C 88 196 88 196 88 196 Z',
  photoArt:'M88 236 C 100 226 110 222 120 226 C 130 230 140 228 152 220 L 152 246 L 88 246 Z',
  photoCat:'M108 228 C 108 220 110 214 112 212 C 114 215 116 217 118 218 C 120 217 122 215 124 212 C 126 214 128 220 128 228 C 124 232 112 232 108 228 Z',
  photoSun:'M138 204 C 143 204 146 207 146 211 C 146 215 143 218 138 218 C 134 218 131 215 131 211 C 131 207 134 204 138 204 Z',
};
const FX = {
  purr:'M196 104 C 204 112 204 124 196 132 M206 96 C 218 108 218 128 206 140 M216 88 C 232 104 232 132 216 148',
  zzz:'M176 128 C 184 128 188 128 190 128 C 184 136 180 140 176 144 C 182 144 186 144 190 144 M196 104 C 202 104 206 104 208 104 C 202 110 200 114 196 118 C 200 118 204 118 208 118 M212 82 C 216 82 220 82 222 82 C 218 87 216 90 212 94 C 216 94 220 94 222 94',
  think:'M190 84 C 194 84 196 86 196 90 C 196 94 194 96 190 96 C 186 96 184 94 184 90 C 184 86 186 84 190 84 Z M206 62 C 212 62 216 66 216 72 C 216 78 212 82 206 82 C 200 82 196 78 196 72 C 196 66 200 62 206 62 Z M226 34 C 234 34 240 40 240 48 C 240 56 234 62 226 62 C 218 62 212 56 212 48 C 212 40 218 34 226 34 Z',
  heart:'M0 6 C -7 1 -8 -5 -4 -7 C -2 -8 0 -6 0 -5 C 0 -6 2 -8 4 -7 C 8 -5 7 1 0 6 Z',
};

const RR3_SVG = `<svg class="rr-svg" viewBox="0 0 240 292" aria-hidden="true"><g class="rr-char">
 <g data-part="body" data-val="sit">
  <g class="tail" style="transform-origin:170px 270px">${B(SIT.tail,'f fur')}${B(SIT.tailRings,'stripe')}${B(SIT.tailTip,'cream')}</g>
  <g data-part="hind" data-val="dangle">${BM('M86 270 C 84 280 84 288 88 292 C 94 296 104 292 104 284 C 104 278 102 272 100 268 Z','f fur')}</g>
  ${BM(SIT.feetL,'f cream')}
  ${B(SIT.body,'f fur')}${BM(SIT.bodyShadeL,'shade dt')}${B(SIT.belly,'cream')}${BM(SIT.sideStripesL,'stripe dt')}${B(SIT.ruff,'cream')}
  <g data-part="legL" data-val="on">${B(SIT.legL,'f fur')}${B(SIT.legStripeL,'stripe dt')}${B(SIT.pawL,'f cream')}${B(PAW_TOES(98,272),'ln thin dt')}</g>
  <g data-part="legR" data-val="on">${B(mirX(SIT.legL,240),'f fur')}${B(mirX(SIT.legStripeL,240),'stripe dt')}${B(mirX(SIT.pawL,240),'f cream')}${B(PAW_TOES(142,272),'ln thin dt')}</g>
 </g>
 <g data-part="body" data-val="gente">
  ${BM(GENTE.legL,'f fur')}${BM(GENTE.legStripeL,'stripe dt')}${BM(GENTE.footL,'f cream')}${BM(GENTE.padsL,'pads dt')}
  <g class="tail" style="transform-origin:180px 240px">${B(GENTE.tail,'f fur')}${B(GENTE.tailRings,'stripe')}${B(GENTE.tailTip,'f cream')}</g>
  <g class="breath">${B(GENTE.body,'f fur')}${BM(GENTE.bodyShadeL,'shade dt')}${B(GENTE.belly,'cream')}${BM(GENTE.sideStripesL,'stripe dt')}${B(GENTE.ruff,'cream')}</g>
  <g data-part="gentearms" data-val="on">${B(GENTE.armL,'f fur')}${B(GENTE.handL,'f cream')}${B(GENTE.fingersL,'ln thin dt')}
   <g class="scratch" style="transform-origin:146px 182px">${B(mirX(GENTE.armL,240),'f fur')}${B(mirX(GENTE.handL,240),'f cream')}${B(mirX(GENTE.fingersL,240),'ln thin dt')}</g></g>
 </g>
 <g data-part="body" data-val="curl">
  <g class="tail" style="transform-origin:200px 260px">${B(CURL.tail,'f fur')}${B(CURL.tailTip,'cream')}</g>
  <g class="breath">${B(CURL.body,'f fur')}${B(CURL.shade,'shade dt')}${B(CURL.stripes,'stripe')}</g>${B(CURL.paws,'f cream')}
 </g>
 <g data-part="body" data-val="stretch">
  <g class="tail" style="transform-origin:218px 176px">${B(STRETCH.tail,'f fur')}${B(STRETCH.tailRings,'stripe')}${B(STRETCH.tailTip,'cream')}</g>
  ${B(STRETCH.rear2,'f fur')}${B(STRETCH.rear1,'f fur')}
  ${B(STRETCH.body,'f fur')}${B(STRETCH.belly,'cream')}${B(STRETCH.stripes,'stripe')}
  ${B(STRETCH.front2,'f fur')}${B(STRETCH.front1,'f fur')}${B(STRETCH.paws,'f cream')}${B(STRETCH.ruff,'cream')}
 </g>
 <g data-part="prop" data-val="book">${B(PROPS.book,'f paper')}${B(PROPS.bookLines,'ln thin')}</g>
 <g data-part="prop" data-val="yarn">${B(PROPS.yarn,'f yarn')}${B(PROPS.yarnLines,'ln thin')}</g>
 <g data-part="prop" data-val="photo">${B(PROPS.photo,'f paper')}${B(PROPS.photoIn,'sky')}${B(PROPS.photoSun,'sun')}${B(PROPS.photoArt,'hill')}${B(PROPS.photoCat,'f fur')}</g>
 <g class="head" data-part="head" data-val="on"><g transform="translate(20 6)">${HEAD_SVG}</g></g>
 <path data-part="wave" data-val="on" class="ln wave" d="M42 192 C 52 182 62 182 72 192 S 92 202 102 192 S 122 182 132 192 S 152 202 162 192 S 182 182 192 192"/>
 <g data-part="arms" data-val="wave"><g class="waving" style="transform-origin:150px 200px">${B(ARMS.wave,'f fur')}${B(ARMS.wavePaw,'f cream')}</g></g>
 <g data-part="arms" data-val="chin">${B(ARMS.chin,'f fur')}${B(ARMS.chinPaw,'f cream')}</g>
 <g data-part="arms" data-val="up">${BM(ARMS.upL,'f fur')}${BM(ARMS.upPawL,'f cream')}</g>
 <g data-part="arms" data-val="cover">${BM(ARMS.coverL,'f fur')}${BM(ARMS.coverPawL,'f cream')}${B('M80 116 C 81 120 82 122 83 124 M88 112 C 88 116 88 119 88 122 M96 114 C 95 118 94 121 93 124','ln thin')}${B(mirX('M80 116 C 81 120 82 122 83 124 M88 112 C 88 116 88 119 88 122 M96 114 C 95 118 94 121 93 124',240),'ln thin')}</g>
 <g data-part="arms" data-val="hold">${BM(ARMS.holdL,'f fur')}${BM(ARMS.holdPawL,'f cream')}</g>
 <g data-part="arms" data-val="frame">${BM(ARMS.frameL,'f fur')}${BM(ARMS.framePawL,'f cream')}</g>
</g>
<g data-part="edge" data-val="on">${B('M0 196 L 240 196 L 240 292 L 0 292 Z','bgfill')}${B('M8 196 C 80 195 160 195 232 196','ln edge')}${BM('M70 196 C 70 186 94 184 100 194 C 102 200 72 202 70 196 Z','f cream')}</g>
<g data-part="fx" data-val="purr" class="purr">${B(FX.purr,'ln fxln')}</g>
<g data-part="fx" data-val="zzz" class="zzz">${B(FX.zzz,'ln fxln')}</g>
<g data-part="fx" data-val="think">${B(FX.think,'ln fxln thin')}</g>
<g data-part="fx" data-val="hearts" class="hearts">${[[46,44,2],[200,40,1.6],[122,14,2.3]].map(([x,y,s])=>`<path class="f heart" d="${FX.heart}" transform="translate(${x} ${y}) scale(${s})"/>`).join('')}</g>
</svg>`;

export const RR_POSES = {
  logo:      { body:'logo', eyes:'open' },
  neutro:    { eyes:'open', mouth:'w' },
  gente:     { body:'gente', eyes:'open', brows:'up', mouth:'w', hr:-4, hy:-2 },
  beijinho:  { body:'gente', eyes:'soft', mouth:'smile', hr:-7, hy:-2 },
  'coçar':   { body:'gente', eyes:'soft', mouth:'smile', hr:5, hy:-2, scratch:1 },
  curioso:   { eyes:'open', ex:4, ey:-2, mouth:'w', hr:-12 },
  feliz:     { eyes:'happy', mouth:'open' },
  saltar:    { eyes:'happy', mouth:'open', arms:'up', cy:-20, hind:'dangle' },
  dormir:    { body:'curl', eyes:'closed', mouth:'w', fx:'zzz', hx:-58, hy:100, hs:.62, hr:-10 },
  esticar:   { body:'stretch', eyes:'happy', mouth:'smile', hx:-66, hy:104, hs:.6, hr:-4 },
  espreitar: { body:'peek', eyes:'open', ey:-3, mouth:'w', hy:62 },
  acenar:    { eyes:'happy', mouth:'open', arms:'wave' },
  triste:    { eyes:'open', ey:3, brows:'on', mouth:'w', hr:6 },
  pensar:    { eyes:'open', ex:4, ey:-5, mouth:'w', arms:'chin', fx:'think', hr:-6 },
  tapar:     { eyes:'closed', mouth:'w', arms:'cover' },
  ler:       { body:'gente', eyes:'open', ey:4, brows:'up', mouth:'w', arms:'hold', prop:'book', hr:-5, hy:-2 },
  bocejar:   { eyes:'closed', mouth:'yawn', sy:1.03 },
  ronronar:  { eyes:'closed', mouth:'w', fx:'purr' },
  novelo:    { eyes:'open', brows:'on', mouth:'w', arms:'hold', prop:'yarn', hr:5 },
  fotografia:{ eyes:'happy', mouth:'open', arms:'frame', prop:'photo' },
};
export const RR_LABELS = { neutro:'Neutro', gente:'Sentado como gente', beijinho:'Beijinho de gato', 'coçar':'A coçar a barriga', curioso:'Curioso',
  feliz:'Feliz', saltar:'A saltar', dormir:'A dormir enrolado', esticar:'O esticão', espreitar:'A espreitar', acenar:'A acenar', triste:'Triste, mas meigo',
  pensar:'A pensar', tapar:'A tapar os olhos', ler:'A ler a ficha', bocejar:'A bocejar', ronronar:'A ronronar', novelo:'Sem ligação', fotografia:'Orgulhoso da fotografia', logo:'Logo' };

export const RR = { mode:'ativo', night:false, all:new Set(), said:new Set() };
export function rrMode(){ return RR.mode==='desligado' ? 'off' : (RR.mode==='calmo' || RR.night) ? 'calm' : 'on'; }

export function makeRonron(host, { size=48, pose='neutro', base=null, bubble=null, logo=null } = {}){
  host.classList.add('rr'); host.style.setProperty('--rr-size', size+'px'); host.innerHTML = RR3_SVG;
  const svg = host.querySelector('svg'); let current = pose, timers = [];
  host.style.setProperty('--ow', Math.max(4.5, 1.25*240/size));
  host.classList.toggle('rr-small', size <= 48);
  const api = { el:host, base: base || pose, bubbleEl: bubble };
  function set(name){
    const p = RR_POSES[name] || RR_POSES.neutro; current = name;
    const body = p.body || 'sit', arms = body==='sit' ? (p.arms || 'legs') : (p.arms || null);
    const want = { body, eyes:p.eyes, mouth:p.mouth || 'w', arms, prop:p.prop, fx:p.fx, brows:p.brows, lids:p.lids, hind:p.hind, wave:p.wave,
      edge: body==='peek'?'on':null, head:'on', ears:'on',
      legL: (arms==='legs'||arms==='chin'||arms==='wave') ? 'on':null, legR: arms==='legs' ? 'on':null, gentearms: (body==='gente' && !arms) ? 'on' : null };
    svg.querySelectorAll('[data-part]').forEach(e => { const k = e.dataset.part; e.classList.toggle('on', want[k] === e.dataset.val); });
    svg.classList.toggle('scratching', !!p.scratch);
    host.classList.toggle('as-logo', body==='logo');
    const v = (k,d,u='',def=0) => svg.style.setProperty(k, (p[d] ?? def) + u);
    v('--hr','hr','deg'); v('--hy','hy','px'); v('--hx','hx','px'); v('--cy','cy','px'); v('--hs','hs','',1); v('--sy','sy','',1);
    svg.style.setProperty('--ex', (p.ex||0)+'px'); svg.style.setProperty('--ey', (p.ey||0)+'px');
    host.dataset.pose = name;
  }
  api.pose = n => { clear(); set(n); return api; };
  api.current = () => current;
  function clear(){ timers.forEach(clearTimeout); timers = []; }
  api.seq = (steps, after) => { clear(); let t = 0;
    for(const [n, ms] of steps){ timers.push(setTimeout(() => set(n), t)); t += ms; }
    timers.push(setTimeout(() => set(after ?? api.base), t)); return t; };
  api.say = (txt, ms=2200, once=null) => { const b = api.bubbleEl; if(!b || rrMode()==='off') return; if(once){ if(RR.said.has(once)) return; RR.said.add(once); }
    b.textContent = txt; b.classList.add('show'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), ms); };
  api.lookAt = (x, y) => { if((RR_POSES[current]||{}).eyes !== 'open') return; const r = svg.getBoundingClientRect();
    const dx = x - (r.left + r.width/2), dy = y - (r.top + r.height*.38), d = Math.hypot(dx,dy) || 1, k = Math.min(1, d/300);
    svg.style.setProperty('--ex', (dx/d*5*k)+'px'); svg.style.setProperty('--ey', (dy/d*4*k)+'px'); };
  api.react = (what) => {
    const m = rrMode(); if(m==='off') return api.pose(api.base);
    const calm = m==='calm';
    const R = {
      gosto:     () => api.seq(calm ? [['feliz',900]] : [['saltar',420],['feliz',650],['ronronar',350]]),
      passar:    () => api.seq([['curioso',900]]),
      desfazer:  () => api.seq([['tapar',650],['espreitar',350],['curioso',400]]),
      ficha:     () => api.seq([['beijinho',600]], 'ler'),
      conhecer:  () => api.seq(calm ? [['acenar',900]] : [['saltar',380],['acenar',700],['ronronar',400]], 'ronronar'),
      vazio:     () => api.seq([['gente',1200],['beijinho',900],['bocejar',800]], 'dormir'),
      bocejar:   () => api.seq([['bocejar',900],['beijinho',600]]),
      erro:      () => api.seq([['pensar',500]], 'novelo'),
      publicar:  () => api.seq([['fotografia',1500]]),
      adotado:   () => api.seq(calm ? [['feliz',1200]] : [['saltar',380],['feliz',300],['saltar',380],['acenar',500]]),
      ronronar:  () => api.seq([['ronronar',1300]]),
      brincar:   () => api.seq(calm ? [['feliz',600]] : [['saltar',380],['feliz',500]]),
      repouso:   () => api.seq([['gente',1400],['beijinho',900],['coçar',1300],['curioso',700]], 'gente'),
      abrir:     () => api.seq([['logo',450],['espreitar',450],['esticar',1000],['neutro',250],['acenar',900],['gente',500]]),
    };
    (R[what] || (() => api.pose(api.base)))();
  };
  set(pose); RR.all.add(api); return api;
}
addEventListener('pointermove', e => { if(e.pointerType !== 'mouse' || rrMode()==='off') return; RR.all.forEach(a => a.el.isConnected && a.lookAt(e.clientX, e.clientY)); }, { passive:true });

