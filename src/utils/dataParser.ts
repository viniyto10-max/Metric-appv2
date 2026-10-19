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

const parseNumber = (val: string): number => {
  if (!val) return 0;
  let cleaned = String(val).replace(/\./g, '').replace('%', '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
};

export const parseDate = (val: string): Date | null => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Check ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split(/[-T ]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD/MM/YY
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback
  const ts = Date.parse(trimmed);
  if (!isNaN(ts)) {
    return new Date(ts);
  }
  return null;
};

export const parseCSVData = (csvText: string): ParsedData => {
  const result = Papa.parse<string[]>(csvText, { header: false, skipEmptyLines: 'greedy' });
  const rawRows: string[][] = result.data || [];
  if (rawRows.length < 2) {
    return { posts: [], seguidores: 0, seguindo: 0 };
  }
  
  let seguidores = 0;
  let seguindo = 0;

  // Scan for seguidores and seguindo in columns 11 and 12
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    if (!seguidores && row[11]) {
      const val = parseNumber(row[11]);
      if (val > 0) seguidores = val;
    }
    if (!seguindo && row[12]) {
      const val = parseNumber(row[12]);
      if (val > 0) seguindo = val;
    }
    if (seguidores > 0 && seguindo > 0) break;
  }

  const posts: InstagramPost[] = [];
  const rows = rawRows.slice(1); // skip header

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const dateStr = (row[0] || '').trim();
    const postUrl = (row[1] || '').trim();
    const legenda = (row[2] || '').trim();

    // Skip empty lines or rows that only contain follower counts (e.g. Row 1 in sheet)
    if (!dateStr && !postUrl && !legenda) {
      continue;
    }

    const parsedDate = parseDate(dateStr);
    // If there is no valid date AND no post URL, this is not a publication row
    if (!parsedDate && !postUrl) {
      continue;
    }

    const finalDate = parsedDate || new Date();

    posts.push({
      data: finalDate,
      post: postUrl,
      legenda,
      likes: parseNumber(row[3]),
      comentarios: parseNumber(row[4]),
      engajamentoTotal: parseNumber(row[5]),
      alcance: parseNumber(row[6]),
      compartilhamento: parseNumber(row[7]),
      engajamentoMedio: parseNumber(row[8]),
      tipoPost: (row[9] || '').trim(),
      realEngajamento: parseNumber(row[10]),
      engajamentoNum: parseNumber(row[10]),
    });
  }

  return { posts, seguidores, seguindo };
};

export const getPostType = (post: InstagramPost): 'video' | 'carrossel' | 'card_unico' => {
  const tipo = String(post.tipoPost || '').toUpperCase().trim();
  if (tipo.includes('VIDEO') || tipo.includes('REEL')) return 'video';
  if (tipo.includes('CARROSEL') || tipo.includes('CAROUSEL') || tipo.includes('ALBUM') || tipo.includes('SIDE')) return 'carrossel';
  if (tipo.includes('IMAGE') || tipo.includes('FOTO') || tipo.includes('CARD') || tipo.includes('IMG') || tipo.includes('STATIC')) return 'card_unico';
  
  if (post.post && (post.post.includes('/reel/') || post.post.includes('/reels/'))) {
    return 'video';
  }
  return 'card_unico';
};
