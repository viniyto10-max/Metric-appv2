import Papa from 'papaparse';

export interface InstagramPost {
  data: Date;
  post: string;
  legenda: string;
  likes: number;
  comentarios: number;
  engajamentoTotal: number;
  alcance: number;
  compartilhamento: number;
  engajamentoMedio: number;
  tipoPost: string;
  realEngajamento: number;
  engajamentoNum: number;
}

export interface ParsedData {
  posts: InstagramPost[];
  seguidores: number;
  seguindo: number;
}

type Row = string[];

/**
 * Converte números vindos da planilha.
 * Aceita formato brasileiro ("1.234,56", "4,5%") e também ponto decimal ("4.52").
 */
export const parseNumber = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  let s = String(val).trim().replace(/%/g, '').replace(/\s/g, '').replace(/R\$/i, '');
  if (!s) return 0;

  if (s.includes(',')) {
    // pt-BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" ou "12.345.678" -> separador de milhar
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/** Converte "dd/mm/aaaa" (com ou sem hora) em Date local. Retorna null se inválida. */
export const parseDate = (val: unknown): Date | null => {
  if (!val) return null;
  const str = String(val).trim().split(' ')[0];
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  if (!day || !month || !year) return null;
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
};

/** Converte "aaaa-mm-dd" (valor de <input type="date">) em Date LOCAL (new Date("aaaa-mm-dd") usa UTC e desloca um dia no Brasil). */
export const parseInputDate = (val: string, endOfDay = false): Date | null => {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return null;
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
};

const cell = (row: Row | undefined, idx: number): string => (row && row[idx] != null ? String(row[idx]) : '');

export const parseCSVData = (csvText: string): ParsedData => {
  const result = Papa.parse<Row>(csvText, { header: false, skipEmptyLines: true });
  const rawRows = result.data;
  const rows = rawRows.slice(1); // pula o cabeçalho

  let seguidores = 0;
  let seguindo = 0;

  // Célula L3/M3 = linha de índice 2 em rawRows (0 = cabeçalho)
  if (rawRows.length > 2) {
    seguidores = parseNumber(cell(rawRows[2], 11));
    seguindo = parseNumber(cell(rawRows[2], 12));
  }

  // Fallback se L3/M3 estiverem vazias
  if (!seguidores) {
    for (let i = 1; i < rawRows.length; i++) {
      const val = parseNumber(cell(rawRows[i], 11));
      if (val > 0) { seguidores = val; break; }
    }
  }
  if (!seguindo) {
    for (let i = 1; i < rawRows.length; i++) {
      const val = parseNumber(cell(rawRows[i], 12));
      if (val > 0) { seguindo = val; break; }
    }
  }

  const posts: InstagramPost[] = [];
  for (const row of rows) {
    const data = parseDate(cell(row, 0)); // A
    const post = cell(row, 1).trim(); // B
    // Ignora linhas sem data válida e sem link (ex.: linhas que só têm seguidores/seguindo)
    if (!data && !post) continue;

    posts.push({
      data: data ?? new Date(),
      post,
      legenda: cell(row, 2), // C
      likes: parseNumber(cell(row, 3)), // D
      comentarios: parseNumber(cell(row, 4)), // E
      engajamentoTotal: parseNumber(cell(row, 5)), // F
      alcance: parseNumber(cell(row, 6)), // G
      compartilhamento: parseNumber(cell(row, 7)), // H
      engajamentoMedio: parseNumber(cell(row, 8)), // I
      tipoPost: cell(row, 9), // J
      realEngajamento: parseNumber(cell(row, 10)), // K
      engajamentoNum: parseNumber(cell(row, 10)),
    });
  }

  return { posts, seguidores, seguindo };
};

export const getPostType = (post: InstagramPost): 'video' | 'carrossel' | 'card_unico' => {
  const tipo = String(post.tipoPost || '').toUpperCase().trim();
  if (tipo.includes('VIDEO') || tipo.includes('VÍDEO') || tipo.includes('REEL')) return 'video';
  if (tipo.includes('CARROSEL') || tipo.includes('CARROSSEL') || tipo.includes('CAROUSEL') || tipo.includes('ALBUM')) return 'carrossel';
  if (tipo.includes('IMAGE') || tipo.includes('FOTO') || tipo.includes('CARD') || tipo.includes('IMG')) return 'card_unico';

  if (post.post && (post.post.includes('/reel/') || post.post.includes('/reels/'))) {
    return 'video';
  }
  return 'card_unico';
};
