/* ───────────────────────────────────────────────────────────────────────────
 * V-Mart Unlimited · canvas renderer
 * Two layers: STATIC (pre-rendered floor/walls/fixtures) + DYNAMIC (per-frame
 * agents/queues/staff). Hit testing for click-to-inspect.
 * ─────────────────────────────────────────────────────────────────────────── */

const W = 1800, H = 1140;

// Renderer assumes a <canvas> already present.
class Renderer {
  constructor(canvas, sim) {
    this.canvas = canvas;
    this.sim = sim;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._resize();
    this.ctx = canvas.getContext('2d');
    // Static layer (off-screen): floor, walls, fixtures, zone tints, labels
    this.bg = document.createElement('canvas');
    this.bg.width = W * this.dpr;
    this.bg.height = H * this.dpr;
    this.bgCtx = this.bg.getContext('2d');
    this.bgCtx.scale(this.dpr, this.dpr);
    this._renderBackground();

    this.selected = null;     // selected agent for inspector
    this.hover = null;        // hovered agent (tooltip)
    this.showHeatmap = false;
    this.showPaths = false;
    this.showStaff = true;
    this.showQueues = true;
    this.filterPersona = null; // when set, fade others to 30% alpha
    this.pings = [];           // {x, y, color, t0, ttl}
    this._lastEventCount = 0;

    // Heat density buffer
    this._heatCells = null;
    this._heatLast = -1;

    canvas.addEventListener('click', e => this._onClick(e));
    canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    window.addEventListener('resize', () => { this._resize(); });
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width  = rect.width  * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.cssW = rect.width;
    this.cssH = rect.height;
  }

  // ─── coordinate transforms ───────────────────────────────
  _toCanvas(x, y) {
    return { x: (x / W) * this.cssW * this.dpr, y: (y / W) * this.cssW * this.dpr };
  }
  _fromMouse(evt) {
    const r = this.canvas.getBoundingClientRect();
    const mx = (evt.clientX - r.left) / r.width * W;
    const my = (evt.clientY - r.top) / r.height * H;
    return { x:mx, y:my };
  }

  // ─── static background render ────────────────────────────
  _renderBackground() {
    const ctx = this.bgCtx;
    // Grass
    this._drawGrass(ctx);

    // Trees
    this._drawTrees(ctx);

    // Path leading to entry
    this._drawPath(ctx);

    // Store shadow / foundation
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(120, 80, 1560, 940);

    // Floor
    this._drawFloor(ctx);

    // Outer walls
    ctx.fillStyle = '#4A2F1C';
    ctx.fillRect(116, 76, 1568, 14);          // N
    ctx.fillRect(116, 1010, 924, 14);         // S left
    ctx.fillRect(1160, 1010, 524, 14);        // S right
    ctx.fillRect(116, 76, 14, 948);           // W
    ctx.fillRect(1670, 76, 14, 948);          // E
    ctx.fillStyle = '#8B6440';
    ctx.fillRect(120, 80, 1560, 4);           // inner N highlight
    ctx.fillRect(120, 1006, 920, 4);          // inner S left
    ctx.fillRect(1160, 1006, 520, 4);

    // Door
    ctx.fillStyle = '#8B6440';
    ctx.fillRect(1040, 1006, 120, 20);
    ctx.fillStyle = '#3A5878';
    ctx.fillRect(1042, 1008, 58, 16);
    ctx.fillRect(1102, 1008, 58, 16);
    ctx.strokeStyle = '#FAF2D8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(1100, 1008); ctx.lineTo(1100, 1024); ctx.stroke();

    // Hanging V-MART sign
    ctx.fillStyle = '#1F1611';
    ctx.fillRect(1010, 1024, 180, 22);
    ctx.fillStyle = '#E11D26';
    ctx.fillRect(1014, 1028, 172, 14);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('V-MART UNLIMITED', 1100, 1039);

    // Windows
    [300, 500, 720, 1300, 1500].forEach(x => {
      ctx.fillStyle = '#88B5D8';
      ctx.fillRect(x, 1010, 80, 14);
      ctx.strokeStyle = '#2A4060';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 1010, 80, 14);
      ctx.beginPath(); ctx.moveTo(x + 40, 1010); ctx.lineTo(x + 40, 1024); ctx.stroke();
    });

    // Zone tints
    this._drawZones(ctx);

    // Sub-zone dividers
    ctx.fillStyle = 'rgba(185,142,90,0.4)';
    [
      [618, 200, 2, 700], [720, 220, 2, 660], [980, 100, 2, 800],
      [1200, 100, 2, 800], [1420, 220, 2, 660],
      [140, 218, 460, 2], [140, 700, 460, 2], [140, 880, 460, 2], [600, 200, 380, 2],
    ].forEach(r => ctx.fillRect(...r));

    // Fixtures
    this._drawFixtures(ctx);

    // Zone labels
    this._drawLabels(ctx);

    // Trial cubicles drawn here (they're "static fixtures" although the busy state is dynamic)
    this._drawTrialBank(ctx);

    // Billing counters drawn STATIC (open/closed state painted dynamically)
    this._drawCountersBase(ctx);

    // Stockroom door
    ctx.fillStyle = '#6B4D32';
    ctx.fillRect(880, 100, 100, 90);
    ctx.strokeStyle = '#4A2F1C';
    ctx.lineWidth = 2;
    ctx.strokeRect(880, 100, 100, 90);
    ctx.fillStyle = '#FAF2D8';
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STOCK', 930, 135);
    ctx.fillText('ROOM', 930, 150);
    ctx.fillStyle = '#2A1810';
    ctx.fillRect(924, 160, 12, 22);
  }

  _drawGrass(ctx) {
    ctx.fillStyle = '#B7DCA1';
    ctx.fillRect(0, 0, W, H);
    // Tiny grass dabs
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      // Skip inside store
      if (x > 100 && x < 1700 && y > 60 && y < 1030) continue;
      ctx.fillStyle = Math.random() < 0.5 ? '#C9E8B7' : '#9FCC8B';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  _drawTrees(ctx) {
    const trees = [
      [40,60],[60,300],[50,540],[40,800],[60,1060],
      [1740,60],[1760,300],[1740,560],[1750,820],[1730,1070],
      [700,1080],[1280,1090],
    ];
    for (const [tx, ty] of trees) {
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(tx, ty + 56, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
      // trunk
      ctx.fillStyle = '#5A3920';
      ctx.fillRect(tx - 3, ty + 32, 6, 20);
      // foliage
      ctx.fillStyle = '#2E7B41';
      ctx.beginPath(); ctx.arc(tx, ty + 22, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5BA66A';
      ctx.beginPath(); ctx.arc(tx - 9, ty + 18, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tx + 9, ty + 20, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7DC58D';
      ctx.beginPath(); ctx.arc(tx - 3, ty + 10, 9, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawPath(ctx) {
    ctx.fillStyle = '#EAD89A';
    ctx.fillRect(940, 1000, 180, 140);
    ctx.fillRect(860, 1080, 340, 60);
    // path stones / dabs
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = '#D8C277';
      const x = 860 + Math.random() * 340;
      const y = 1000 + Math.random() * 140;
      if (x > 940 && x < 1120) ctx.fillRect(x, y, 2, 2);
      else if (y > 1080) ctx.fillRect(x, y, 2, 2);
    }
  }

  _drawFloor(ctx) {
    ctx.fillStyle = '#EAD7AB';
    ctx.fillRect(120, 80, 1560, 940);
    // tile grid
    ctx.strokeStyle = '#D9C28C';
    ctx.lineWidth = 1;
    for (let x = 120; x < 1680; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, 1020); ctx.stroke();
    }
    for (let y = 80; y < 1020; y += 32) {
      ctx.beginPath(); ctx.moveTo(120, y); ctx.lineTo(1680, y); ctx.stroke();
    }
  }

  _drawZones(ctx) {
    const Z = [
      [140, 100, 200, 90,  'rgba(220,196,228,0.45)'],   // W nightwear
      [350, 100, 160, 90,  'rgba(255,200,150,0.50)'],   // W footwear
      [140, 220, 220, 240, 'rgba(255,164,184,0.42)'],   // kurti
      [380, 220, 220, 220, 'rgba(231,127,153,0.32)'],   // saree
      [140, 480, 220, 220, 'rgba(245,184,200,0.38)'],   // suits
      [380, 460, 220, 240, 'rgba(204,86,124,0.30)'],    // lehenga
      [140, 720, 460, 160, 'rgba(196,176,224,0.42)'],   // W western
      [140, 900, 460, 80,  'rgba(232,180,212,0.45)'],   // W accessories
      [520, 100, 340, 110, 'rgba(160,220,196,0.55)'],   // trial
      [1000, 100, 200, 90, 'rgba(195,212,228,0.42)'],   // M nightwear
      [1220, 100, 180, 90, 'rgba(176,188,200,0.46)'],   // M footwear
      [1420, 100, 240, 90, 'rgba(255,213,124,0.60)'],   // Kids ethnic peak
      [620, 220, 100, 660, 'rgba(240,222,180,0.45)'],   // promo aisle
      [740, 220, 240, 180, 'rgba(170,200,228,0.45)'],   // M casual T
      [740, 420, 240, 180, 'rgba(170,200,228,0.45)'],   // M casual shirt
      [740, 620, 240, 260, 'rgba(170,200,228,0.45)'],   // M casual bottoms
      [1000, 220, 200, 200, 'rgba(140,170,200,0.50)'],  // M formal
      [1000, 440, 200, 240, 'rgba(178,156,220,0.50)'],  // M ethnic
      [1000, 700, 200, 180, 'rgba(176,188,200,0.46)'],  // M footwear main
      [1220, 220, 200, 160, 'rgba(255,212,168,0.45)'],  // boys 4-8
      [1220, 400, 200, 160, 'rgba(255,212,168,0.45)'],  // boys 8-14
      [1440, 220, 240, 160, 'rgba(255,212,168,0.45)'],  // girls 4-8
      [1440, 400, 240, 160, 'rgba(255,212,168,0.45)'],  // girls 8-14
      [1220, 580, 200, 120, 'rgba(255,212,168,0.45)'],  // kids nightwear
      [1440, 580, 240, 200, 'rgba(255,196,220,0.50)'],  // infants
      [1220, 720, 200, 160, 'rgba(176,188,200,0.46)'],  // kids footwear
      [620, 900, 380, 80,  'rgba(255,142,156,0.55)'],   // power wall
      [1020, 900, 660, 80, 'rgba(228,205,148,0.55)'],   // billing
    ];
    for (const [x, y, w, h, c] of Z) {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    }
  }

  _drawFixtures(ctx) {
    // Clothing racks — drawn as small brown bars with colorful garments
    const racks = [
      // Women's ethnic kurti
      [160,290],[160,340],[160,390],[160,440],
      [280,290],[280,340],[280,440],
      // saree (folded tables)
      ['table', 430,275],['table',430,325],['table',430,375],
      [540,275],[540,325],[540,375],
      // suits
      [160,545],[160,595],[160,645],
      [280,545],[280,595],[280,645],
      // women's western
      [160,765],[160,815],[290,765],[290,815],
      [420,765],[420,815],[540,765],[540,815],
      // men's casual tees
      [755,285],[755,335],[755,385],
      [870,285],[870,335],[870,385],
      // shirts
      [755,485],[755,535],[755,585],
      [870,485],[870,535],[870,585],
      // bottoms
      [755,685],[755,735],[755,785],[755,835],
      [870,685],[870,735],[870,785],[870,835],
      // formal
      [1015,285],[1015,335],[1015,385],
      [1110,285],[1110,335],[1110,385],
      // men's ethnic racks
      [1015,585],[1015,635],
      [1110,585],[1110,635],
      // kids racks
      [1235,285],[1235,325],[1330,285],[1330,325],
      [1235,465],[1235,505],[1330,465],[1330,505],
      [1455,285],[1455,325],[1565,285],[1565,325],
      [1455,465],[1455,505],[1565,465],[1565,505],
      [1235,635],[1235,675],[1330,635],[1330,675],
    ];
    for (const r of racks) {
      if (r[0] === 'table') this._drawTable(ctx, r[1], r[2]);
      else this._drawRack(ctx, r[0], r[1]);
    }
    // small accessory tables on south strip
    for (let i = 0; i < 7; i++) this._drawSmallTable(ctx, 170 + i * 60, 918);
    // mannequins (power wall)
    [[650,915,'f'],[710,915,'m'],[770,915,'f'],[830,915,'k'],[890,915,'f'],[950,915,'m']]
      .forEach(([x,y,t]) => this._drawMannequin(ctx, x, y, t));
    // men's ethnic mannequins
    this._drawMannequin(ctx, 1030, 500, 'm');
    this._drawMannequin(ctx, 1100, 500, 'm');
    this._drawMannequin(ctx, 1170, 500, 'm');
    // kids ethnic display mannequins (north back nook)
    this._drawMannequin(ctx, 1450, 115, 'k');
    this._drawMannequin(ctx, 1530, 115, 'k');
    this._drawMannequin(ctx, 1610, 115, 'k');
    // lehenga mannequins
    this._drawMannequin(ctx, 420, 525, 'f');
    this._drawMannequin(ctx, 500, 525, 'f');
    this._drawMannequin(ctx, 570, 525, 'f');
    // women's footwear nook small tables
    [365,425].forEach(x => { this._drawSmallTable(ctx, x, 115); this._drawSmallTable(ctx, x, 160); });
    // men's footwear back nook
    [1235,1295,1355].forEach(x => { this._drawSmallTable(ctx, x, 120); this._drawSmallTable(ctx, x, 160); });
    // promo islands (center aisle, 3 bins)
    [300, 500, 700].forEach(y => this._drawPromoBin(ctx, 635, y));
    // infants cribs
    [1465,1555,1645].forEach(x => this._drawCrib(ctx, x, 630));
    [1480,1540,1600].forEach(x => { this._drawSmallTable(ctx, x, 690); this._drawSmallTable(ctx, x, 730); });
    // kids footwear small tables
    [1245,1305,1365].forEach(x => { this._drawSmallTable(ctx, x, 775); this._drawSmallTable(ctx, x, 820); });
    // men's footwear main display tables
    [1020,1080,1140].forEach(x => {
      this._drawSmallTable(ctx, x, 725);
      this._drawSmallTable(ctx, x, 775);
      this._drawSmallTable(ctx, x, 825);
    });
    // impulse strip just north of billing
    for (let x = 1035; x < 1660; x += 60) this._drawSmallTable(ctx, x, 888);
  }

  _drawRack(ctx, x, y) {
    ctx.fillStyle = '#7E5230';
    ctx.fillRect(x, y, 76, 12);
    ctx.strokeStyle = '#5A3920';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 76, 12);
    ctx.fillStyle = '#8B6440';
    ctx.fillRect(x, y - 6, 76, 6);
    const colors = ['#D08FB3','#E5A93C','#A567C9','#D04C3E','#5BA66A','#4F87BD','#D08FB3','#E54B6A','#FFD966','#E5A93C'];
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(x + 2 + i * 8, y - 7, 6, 8);
    }
    ctx.fillStyle = '#5A3920';
    ctx.fillRect(x + 6, y + 12, 3, 6);
    ctx.fillRect(x + 67, y + 12, 3, 6);
  }

  _drawTable(ctx, x, y) {
    ctx.fillStyle = '#A07550';
    ctx.fillRect(x, y, 68, 44);
    ctx.strokeStyle = '#5A3920';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 68, 44);
    const colors = ['#D04C3E','#E5A93C','#A567C9','#5BA66A','#4F87BD'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(x + 4, y + 4 + i * 8, 60, 5);
    }
  }

  _drawSmallTable(ctx, x, y) {
    ctx.fillStyle = '#A07550';
    ctx.fillRect(x, y, 44, 32);
    ctx.strokeStyle = '#5A3920';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 44, 32);
    const colors = ['#D08FB3','#FFD966','#5BA66A','#4F87BD'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(x + 3, y + 3 + i * 8, 38, 5);
    }
  }

  _drawMannequin(ctx, x, y, type) {
    const colors = type === 'f' ? ['#E54B6A', '#E54B6A']
      : type === 'm' ? ['#FFD966', '#FFFFFF']
      : ['#E5A93C', '#E5A93C'];
    // head
    ctx.fillStyle = '#F5F0E5';
    ctx.fillRect(x - 2, y, 4, 6);
    // torso
    ctx.fillStyle = colors[0];
    ctx.fillRect(x - 9, y + 6, 18, 22);
    // skirt/pants
    ctx.fillStyle = colors[1];
    ctx.fillRect(x - 11, y + 28, 22, 32);
    // base
    ctx.fillStyle = '#5A3920';
    ctx.beginPath();
    ctx.ellipse(x, y + 62, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPromoBin(ctx, x, y) {
    ctx.fillStyle = '#8B6440';
    ctx.fillRect(x, y, 56, 42);
    ctx.strokeStyle = '#4A2F1C';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 56, 42);
    ctx.fillStyle = '#FAF2D8';
    ctx.fillRect(x + 4, y - 6, 48, 10);
    ctx.strokeStyle = '#5A3920';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y - 6, 48, 10);
    ctx.fillStyle = '#D04C3E';
    ctx.font = 'bold 6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('B2G1', x + 28, y + 2);
    const c = ['#E54B6A','#A567C9','#5BA66A','#FFD966','#4F87BD'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = c[i];
      ctx.fillRect(x + 6, y + 4 + i * 8, 44, 5);
    }
  }

  _drawCrib(ctx, x, y) {
    ctx.fillStyle = '#FAF2D8';
    ctx.fillRect(x, y, 44, 34);
    ctx.strokeStyle = '#A07550';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 44, 34);
    [8, 16, 24, 32].forEach(dx => {
      ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx, y + 34); ctx.stroke();
    });
    ctx.fillStyle = '#FFCBE0';
    ctx.fillRect(x + 2, y + 14, 40, 18);
  }

  _drawTrialBank(ctx) {
    // Bank dimensions chosen so 7W + 4-px divider + 3M fits in the 340-px
    // window between the women's-footwear nook and the stockroom door.
    // 7×30 + 6×2 (gaps) + 6 (divider) + 3×30 + 2×2 (gaps) = 312 px wide,
    // starting at x=520 → ends at x=832; stockroom is at x=880 → clear gap.
    const by = 110;
    let cx = 520;
    const W_LBL = '#5A3920', M_LBL = '#1F4A78';
    const drawCubicle = (x, lbl, col) => {
      ctx.fillStyle = '#FAF2D8';
      ctx.fillRect(x, by, 30, 68);
      ctx.strokeStyle = '#5A3920';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, by, 30, 68);
      ctx.fillStyle = '#2A1810';
      ctx.fillRect(x + 10, by + 50, 10, 18);
      ctx.fillStyle = col;
      ctx.font = 'bold 6px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x + 15, by + 32);
    };
    for (let i = 0; i < 7; i++) { drawCubicle(cx, 'W' + (i + 1), W_LBL); cx += 32; }
    // divider
    ctx.fillStyle = '#5A3920';
    ctx.fillRect(cx, 108, 4, 72);
    cx += 8;
    for (let i = 0; i < 3; i++) { drawCubicle(cx, 'M' + (i + 1), M_LBL); cx += 32; }
  }

  _drawCountersBase(ctx) {
    // Static base rendering — open/closed overlay drawn dynamically each frame
    for (let i = 0; i < 6; i++) {
      const cx = 1040 + i * 105;
      ctx.fillStyle = '#946A47';
      ctx.fillRect(cx, 935, 100, 44);
      ctx.strokeStyle = '#5A3920';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, 935, 100, 44);
      // monitor
      ctx.fillStyle = '#2A1810';
      ctx.fillRect(cx + 70, 941, 24, 20);
      ctx.fillStyle = '#3D7B6A';
      ctx.fillRect(cx + 76, 945, 14, 12);
    }
  }

  _drawLabels(ctx) {
    ctx.fillStyle = '#5A3920';
    ctx.textAlign = 'center';

    const L = (x, y, size, t, color) => {
      ctx.fillStyle = color || '#5A3920';
      ctx.font = 'bold ' + size + 'px "Press Start 2P", monospace';
      ctx.fillText(t, x, y);
    };

    L(240, 155, 7, "W. NIGHTWEAR");
    L(430, 155, 7, "W. FOOTWEAR");
    L(250, 252, 9, "WOMEN'S ETHNIC");
    L(250, 266, 7, "KURTI & SETS", '#8B6440');
    L(490, 252, 9, "WOMEN'S ETHNIC");
    L(490, 266, 7, "SAREE", '#8B6440');
    L(250, 510, 9, "SUITS & SALWAR");
    L(490, 492, 9, "LEHENGA");
    L(490, 506, 7, "★ DIWALI HERO ★", '#A56500');
    L(370, 752, 9, "WOMEN'S WESTERN");
    L(370, 932, 8, "WOMEN'S ACCESSORIES");

    L(690, 135, 9, "TRIAL ROOMS", '#1F4A38');
    L(690, 148, 7, "7 W + 3 M · 0 KIDS", '#1F4A38');

    L(1100, 135, 7, "M. NIGHTWEAR");
    L(1310, 135, 7, "M. FOOTWEAR");
    L(1540, 135, 9, "KIDS ETHNIC", '#A56500');
    L(1540, 150, 7, "★ DIWALI PEAK ★", '#A56500');

    L(860, 252, 9, "MEN'S CASUAL");
    L(860, 266, 7, "T-SHIRTS & POLOS", '#8B6440');
    L(860, 452, 9, "MEN'S CASUAL");
    L(860, 466, 7, "SHIRTS", '#8B6440');
    L(860, 652, 9, "MEN'S CASUAL");
    L(860, 666, 7, "JEANS · CHINOS", '#8B6440');
    L(1100, 252, 9, "MEN'S FORMAL");
    L(1100, 472, 9, "MEN'S ETHNIC");
    L(1100, 486, 7, "KURTA · SHERWANI", '#8B6440');
    L(1100, 732, 9, "MEN'S FOOTWEAR");

    L(1320, 252, 8, "BOYS 4-8");
    L(1320, 432, 8, "BOYS 8-14");
    L(1560, 252, 8, "GIRLS 4-8");
    L(1560, 432, 8, "GIRLS 8-14");
    L(1320, 612, 8, "KIDS NIGHTWEAR");
    L(1560, 612, 9, "INFANTS · NEWBORN");
    L(1320, 752, 9, "KIDS FOOTWEAR");

    L(810, 932, 9, "POWER WALL", '#882128');
    L(810, 945, 7, "festive mannequins", '#882128');
    L(1350, 932, 9, "BILLING · 6 COUNTERS", '#5A3920');
    L(1350, 945, 6, "single straight queue", '#8B6440');

    // Promo aisle single header (no vertical rotated text that collides with bins)
    L(670, 232, 7, "PROMO ISLAND · CENTER AISLE · B2G1 CLEARANCE", '#A56500');
  }

  // ─── per-frame dynamic render ───────────────────────────
  draw() {
    const ctx = this.ctx;
    const scale = this.cssW / W;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Blit background
    ctx.drawImage(this.bg, 0, 0, this.bg.width, this.bg.height, 0, 0, this.cssW, this.cssH);

    // Set up logical coord space
    ctx.scale(scale, scale);

    // Heatmap overlay
    if (this.showHeatmap) this._drawHeatmap(ctx);

    // Counter open/closed overlay
    this._drawCounterStatus(ctx);

    // Queue visualisation
    if (this.showQueues) this._drawQueueOverlays(ctx);

    // Staff
    if (this.showStaff) {
      for (const s of this.sim.staff) {
        this._drawStaff(ctx, s);
      }
    }

    // Detect new sim events → emit pings
    this._collectPings();

    // Agents (with optional persona filter — fade others)
    const sel = this.selected, hov = this.hover;
    for (const a of this.sim.activeAgents) {
      const dim = this.filterPersona && a.profile !== this.filterPersona;
      ctx.globalAlpha = dim ? 0.18 : 1.0;
      this._drawShopper(ctx, a, a === sel, a === hov);
    }
    ctx.globalAlpha = 1.0;

    // Draw event pings (purchases, abandonments)
    this._drawPings(ctx);

    // Selected agent path preview
    if (sel && sel.path && sel.path.length) {
      ctx.strokeStyle = 'rgba(225,29,38,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sel.x, sel.y);
      ctx.lineTo(sel.targetX, sel.targetY);
      for (const wp of sel.path) ctx.lineTo(wp.x, wp.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hover tooltip
    if (hov) this._drawTooltip(ctx, hov);

    // Sim clock overlay (top-left of canvas)
    this._drawClockOverlay(ctx);
  }

  _drawCounterStatus(ctx) {
    for (let i = 0; i < 6; i++) {
      const c = this.sim.counters[i];
      const cx = 1040 + i * 105;
      if (c.open) {
        // green LED
        ctx.fillStyle = '#3DDC84';
        ctx.fillRect(cx + 6, 967, 4, 4);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('C' + (i + 1) + ' OPEN', cx + 50, 975);
      } else {
        ctx.fillStyle = 'rgba(40,30,20,0.55)';
        ctx.fillRect(cx, 935, 100, 44);
        ctx.fillStyle = '#9F8A6B';
        ctx.font = 'bold 6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('C' + (i + 1) + ' SHUT', cx + 50, 975);
      }
    }
  }

  _drawQueueOverlays(ctx) {
    // Billing queue floor strip
    if (this.sim.billing_queue.length > 8) {
      ctx.fillStyle = 'rgba(225,29,38,0.10)';
      ctx.fillRect(1075, 875, 600, 60);
    }
    if (this.sim.billing_queue.length > 18) {
      ctx.fillStyle = 'rgba(225,29,38,0.18)';
      ctx.fillRect(1075, 825, 600, 110);
    }
    // Trial queue floor strip
    if (this.sim.trial_queue_w.length + this.sim.trial_queue_m.length > 4) {
      ctx.fillStyle = 'rgba(225,29,38,0.15)';
      ctx.fillRect(540, 188, 320, 30);
      ctx.fillStyle = '#882128';
      ctx.font = 'bold 7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TRIAL QUEUE · UNMANAGED', 700, 208);
    }
  }

  _drawShopper(ctx, a, selected, hover) {
    const app = a.appearance || { outfit:'casual_m', shirt:a.persona.body, pants:'#1F1611',
      skin:a.persona.skin, hair:a.persona.hair, hairStyle:'med' };
    const bob = (a.state === 'walking') ? Math.sin(a.walk_phase) * 0.5 : 0;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(a.x, a.y + 6.5, 3.8, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outfit-specific body rendering
    if (app.outfit === 'ethnic_f') {
      // Kurti top + flared skirt/saree drape
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 3, a.y - 1, 6, 5);              // top
      ctx.fillStyle = app.pants;
      // flared lower (wider trapezoid feel)
      ctx.fillRect(a.x - 3.5, a.y + 4, 7, 4);            // skirt
      // arms
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 4.3, a.y - 0.5, 1.3, 4);
      ctx.fillRect(a.x + 3, a.y - 0.5, 1.3, 4);
      // dupatta drape (diagonal across torso)
      if (app.hasDupatta) {
        ctx.fillStyle = app.dupattaColor;
        ctx.fillRect(a.x - 2.5, a.y - 0.5, 5, 0.8);     // shoulder drape
        ctx.fillRect(a.x + 1.5, a.y + 0.3, 1.5, 3);    // hanging end
      }
    } else if (app.outfit === 'western_f') {
      // Shirt + jeans/leggings
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 3, a.y - 1, 6, 5);
      ctx.fillStyle = app.pants;
      ctx.fillRect(a.x - 2.5, a.y + 4, 5, 4);
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 4.3, a.y - 0.5, 1.3, 4);
      ctx.fillRect(a.x + 3, a.y - 0.5, 1.3, 4);
    } else if (app.outfit === 'formal_m') {
      // Shirt + dark trousers
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 3, a.y - 1, 6, 5);
      // belt
      ctx.fillStyle = '#1F1611';
      ctx.fillRect(a.x - 3, a.y + 4, 6, 0.6);
      ctx.fillStyle = app.pants;
      ctx.fillRect(a.x - 2.5, a.y + 4.6, 5, 3.4);
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 4.3, a.y - 0.5, 1.3, 4);
      ctx.fillRect(a.x + 3, a.y - 0.5, 1.3, 4);
    } else {
      // casual_m: t-shirt + jeans
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 3, a.y - 1, 6, 4.5);
      ctx.fillStyle = app.pants;
      ctx.fillRect(a.x - 2.8, a.y + 3.5, 5.6, 4);
      ctx.fillStyle = app.shirt;
      ctx.fillRect(a.x - 4.3, a.y - 0.5, 1.3, 3.5);
      ctx.fillRect(a.x + 3, a.y - 0.5, 1.3, 3.5);
    }

    // shopping bag (if applicable) — only show when not in queue
    if (app.hasBag && (a.state === 'walking' || a.state === 'browsing')) {
      ctx.fillStyle = app.bagColor;
      ctx.fillRect(a.x + 4.2, a.y + 1, 1.6, 3);
    }

    // head
    ctx.fillStyle = app.skin;
    ctx.beginPath();
    ctx.arc(a.x, a.y - 3.5 + bob, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // hair (varies by style)
    ctx.fillStyle = app.hair;
    if (app.hairStyle === 'long' && app.outfit !== 'casual_m' && app.outfit !== 'formal_m') {
      // long hair (women): drapes down to shoulders
      ctx.fillRect(a.x - 2.8, a.y - 6.5 + bob, 5.6, 3);  // top
      ctx.fillRect(a.x - 3, a.y - 4 + bob, 1, 4);        // left strand
      ctx.fillRect(a.x + 2, a.y - 4 + bob, 1, 4);        // right strand
    } else if (app.hairStyle === 'med') {
      ctx.fillRect(a.x - 2.7, a.y - 6.5 + bob, 5.4, 3);
    } else if (app.hairStyle === 'tied') {
      ctx.fillRect(a.x - 2.6, a.y - 6.4 + bob, 5.2, 2.6);
      // bun
      ctx.beginPath();
      ctx.arc(a.x, a.y - 7.5 + bob, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // short
      ctx.fillRect(a.x - 2.4, a.y - 6.2 + bob, 4.8, 2.2);
    }

    // glasses (rare)
    if (app.hasGlasses) {
      ctx.strokeStyle = '#1A1410';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(a.x - 1.1, a.y - 3.3 + bob, 0.9, 0, Math.PI * 2);
      ctx.arc(a.x + 1.1, a.y - 3.3 + bob, 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (selected) {
      ctx.strokeStyle = '#E11D26';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    } else if (hover) {
      ctx.strokeStyle = 'rgba(225,29,38,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawStaff(ctx, s) {
    const x = s.x, y = s.y;
    const onBreak = (s.activity === 'break');
    const helping = (s.activity === 'help' && s._helping);

    // help-arc: faint glowing yellow ring + dashed line to the customer
    if (helping) {
      ctx.fillStyle = 'rgba(255,217,102,0.18)';
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,217,102,0.70)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(s._helping.x, s._helping.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 4.4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // pants
    ctx.fillStyle = '#1F1611';
    ctx.fillRect(x - 3, y + 3, 6, 5);

    // shirt (under the vest)
    ctx.fillStyle = onBreak ? '#6B6B6B' : '#3A6B98';
    ctx.fillRect(x - 3.5, y - 1.5, 7, 5);
    // arms (shirt color)
    ctx.fillRect(x - 4.8, y - 0.5, 1.3, 4);
    ctx.fillRect(x + 3.5, y - 0.5, 1.3, 4);

    // YELLOW SAFETY VEST — defining staff visual
    ctx.fillStyle = onBreak ? '#A89060' : '#FFCC00';
    ctx.fillRect(x - 3, y - 1, 6, 4.5);
    // reflective stripes
    ctx.fillStyle = '#FAF2D8';
    ctx.fillRect(x - 3, y + 0.5, 6, 0.6);
    ctx.fillRect(x - 3, y + 2.5, 6, 0.6);
    // vest opening (down the middle)
    ctx.fillStyle = onBreak ? '#3A3328' : '#C39800';
    ctx.fillRect(x - 0.3, y - 1, 0.6, 4.5);

    // head
    ctx.fillStyle = '#F0CFA8';
    ctx.beginPath();
    ctx.arc(x, y - 3.5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // hair
    ctx.fillStyle = '#1F1108';
    ctx.fillRect(x - 2.6, y - 6.5, 5.2, 2.6);

    // ID badge floating above (persistent identifier — fixes "is this staff?")
    ctx.fillStyle = onBreak ? 'rgba(110,110,110,0.85)' : '#E11D26';
    ctx.fillRect(x - 3.5, y - 11, 7, 4);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 3.2px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(onBreak ? 'BRK' : 'STAFF', x, y - 8.2);
  }

  _drawTooltip(ctx, a) {
    const text = a.name + ' · ' + a.persona.label;
    const stateText = '[' + a.state + ']';
    ctx.font = '10px Inter, sans-serif';
    const w = Math.max(ctx.measureText(text).width, ctx.measureText(stateText).width) + 14;
    let tx = a.x + 12, ty = a.y - 30;
    if (tx + w > W) tx = a.x - w - 12;
    ctx.fillStyle = 'rgba(20,16,12,0.92)';
    ctx.fillRect(tx, ty, w, 28);
    ctx.strokeStyle = '#E11D26';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty, w, 28);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(text, tx + 6, ty + 12);
    ctx.fillStyle = '#FFD966';
    ctx.fillText(stateText, tx + 6, ty + 24);
  }

  _drawClockOverlay(ctx) {
    const m = Math.floor(this.sim.simMin);
    const h = Math.floor(m / 60) + 10;
    const mm = m % 60;
    const hh12 = ((h - 1) % 12) + 1;
    const ampm = h < 12 ? 'AM' : 'PM';
    const text = `${hh12}:${String(mm).padStart(2,'0')} ${ampm}`;

    ctx.fillStyle = 'rgba(20,16,12,0.78)';
    ctx.fillRect(140, 92, 200, 36);
    ctx.strokeStyle = '#E11D26';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(140, 92, 200, 36);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.fillText(text, 240, 116);
  }

  _collectPings() {
    const evs = this.sim.events;
    if (evs.length === this._lastEventCount) return;
    for (let i = this._lastEventCount; i < evs.length; i++) {
      const e = evs[i];
      // Look up the agent for position
      const a = this.sim.activeAgents.find(x => x.id === e.agentId) ||
                this.sim.exitedAgents.slice(-50).find(x => x.id === e.agentId);
      if (!a) continue;
      if (e.type === 'purchase') {
        this.pings.push({ x:a.x, y:a.y, color:'rgba(61,220,132,', t0:performance.now(), ttl:900 });
      } else if (e.type === 'abandon_trial' || e.type === 'abandon_bill') {
        this.pings.push({ x:a.x, y:a.y, color:'rgba(225,29,38,', t0:performance.now(), ttl:900 });
      } else if (e.type === 'counter_open') {
        this.pings.push({ x:1090 + (parseInt((e.detail||'C2').replace(/\D/g,''))-1)*105, y:920, color:'rgba(255,217,102,', t0:performance.now(), ttl:1400 });
      }
    }
    this._lastEventCount = evs.length;
    if (this.pings.length > 60) this.pings = this.pings.slice(-60);
  }

  _drawPings(ctx) {
    const now = performance.now();
    const alive = [];
    for (const p of this.pings) {
      const t = (now - p.t0) / p.ttl;
      if (t > 1) continue;
      alive.push(p);
      const r = 6 + t * 24;
      const a = (1 - t) * 0.7;
      ctx.strokeStyle = p.color + a + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.pings = alive;
  }

  _drawHeatmap(ctx) {
    // Smooth radial blobs per agent — additive blending creates organic gradient
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const a of this.sim.activeAgents) {
      const grd = ctx.createRadialGradient(a.x, a.y, 1, a.x, a.y, 70);
      grd.addColorStop(0,   'rgba(225,29,38,0.22)');
      grd.addColorStop(0.4, 'rgba(225,29,38,0.10)');
      grd.addColorStop(1,   'rgba(225,29,38,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(a.x - 70, a.y - 70, 140, 140);
    }
    ctx.restore();
  }

  // ─── hit testing ──────────────────────────────────────
  _onMouseMove(evt) {
    const p = this._fromMouse(evt);
    this.hover = this._pickAgent(p.x, p.y);
  }
  _onClick(evt) {
    const p = this._fromMouse(evt);
    const a = this._pickAgent(p.x, p.y);
    this.selected = a;
    if (typeof this.onSelect === 'function') this.onSelect(a);
  }
  _pickAgent(x, y) {
    // Larger hitbox (~25 logical px) so clicking moving sprites is forgiving
    let best = null, bestDist = 25;
    for (const a of this.sim.activeAgents) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bestDist) { bestDist = d; best = a; }
    }
    return best;
  }
}

window.Renderer = Renderer;
