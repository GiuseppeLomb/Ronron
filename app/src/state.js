// Estado partilhado da app
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('ronron.' + k); return v == null ? d : JSON.parse(v); }catch{ return d; } },
  set(k, v){ try{ localStorage.setItem('ronron.' + k, JSON.stringify(v)); }catch{} },
};
export { LS };
export const S = {
  me: null,            // { user, perfil }
  filtros: LS.get('filtros', { district:'', felvNeg:false, young:false, cats:false, vac:false, dew:false, ster:false }),
  feed: [], idx: 0, trilho: [], busy: false,
  vistos: new Set(LS.get('vistos', [])),
  favs: LS.get('favs', []),
  online: true,
  tema: LS.get('tema', 'auto'),
};
export const guardarFiltros = () => LS.set('filtros', S.filtros);
export const nFiltros = () => Object.values(S.filtros).filter(Boolean).length;
export function marcarVisto(id){ S.vistos.add(id); LS.set('vistos', [...S.vistos].slice(-3000)); }
export function addFav(id){ if(!S.favs.includes(id)){ S.favs.unshift(id); LS.set('favs', S.favs); } }
export function idade(m){ if(m == null) return 'Idade por saber'; if(m < 12) return `${m} ${m == 1 ? 'mês' : 'meses'}`; const a = Math.round(m / 12); return `${a} ${a == 1 ? 'ano' : 'anos'}`; }
export const art = a => (a?.sex === 'femea' ? 'a' : 'o');
export const ARTIGO = a => `${art(a)} ${a.name}`;
