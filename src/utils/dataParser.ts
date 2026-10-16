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
  let cleaned = String(val).replace(/\./g, '').replace('%', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parseDate = (val: string): Date => {
  const parts = val.split('/');
  if (parts.length !== 3) return new Date();
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

export const parseCSVData = (csvText: string): ParsedData => {
  const result = Papa.parse<string[]>(csvText, { header: false, skipEmptyLines: true });
  const rawRows: string[][] = result.data;
  const rows = rawRows.slice(1); // skip header
  
  let seguidores = 0;
  let seguindo = 0;

  // Cell L3 is row index 2 in rawRows (0-indexed: 0=Header, 1=Row2, 2=Row3)
  if (rawRows.length > 2 && rawRows[2]) {
    seguidores = parseNumber(rawRows[2][11] || '0');
    seguindo = parseNumber(rawRows[2][12] || '0');
  }
  
  // Fallback if cell L3/M3 is empty
  if (!seguidores && rawRows.length > 1) {
    for (let i = 1; i < rawRows.length; i++) {
      const val = parseNumber(rawRows[i][11] || '');
      if (val > 0) {
        seguidores = val;
        break;
      }
    }
  }

  if (!seguindo && rawRows.length > 1) {
    for (let i = 1; i < rawRows.length; i++) {
      const val = parseNumber(rawRows[i][12] || '');
      if (val > 0) {
        seguindo = val;
        break;
      }
    }
  }

  const posts = rows.map((row: any) => ({
    data: parseDate(row[0]), // A
    post: row[1], // B
    legenda: row[2], // C
    likes: parseNumber(row[3]), // D
    comentarios: parseNumber(row[4]), // E
    engajamentoTotal: parseNumber(row[5]), // F
    alcance: parseNumber(row[6]), // G
    compartilhamento: parseNumber(row[7]), // H
    engajamentoMedio: parseNumber(row[8]), // I
    tipoPost: row[9] || '', // J
    realEngajamento: parseNumber(row[10]), // K
    engajamentoNum: parseNumber(row[10]),
  }));

  return { posts, seguidores, seguindo };
};

export const getPostType = (post: InstagramPost): 'video' | 'carrossel' | 'card_unico' => {
  const tipo = String(post.tipoPost || '').toUpperCase().trim();
  if (tipo.includes('VIDEO')) return 'video';
  if (tipo.includes('CARROSEL') || tipo.includes('ALBUM')) return 'carrossel';
  if (tipo.includes('IMAGE') || tipo.includes('FOTO') || tipo.includes('CARD') || tipo.includes('IMG')) return 'card_unico';
  
  if (post.post && (post.post.includes('/reel/') || post.post.includes('/reels/'))) {
    return 'video';
  }
  return 'card_unico';
};
