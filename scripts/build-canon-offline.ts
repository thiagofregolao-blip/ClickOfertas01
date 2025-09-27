// scripts/build-canon-offline.ts
import fs from "fs";
import path from "path";

// Dados CSV exportados
const csvData = `id,name,category,brand
cell-001,iPhone 15 128GB,Celulares,
776775aa-ce8c-41d5-b14d-d6203661ca1c,Apple IPHONE 12 PRO MAX A2411 256GB GOLD CPO,Celulares,Apple
c22c3992-7b1b-49d1-b264-01eae7eca7e5,Apple IPHONE 13 128GB MIDNIGHT,Celulares,Apple
cell-002,iPhone 16 128GB,Celulares,
cell-003,Samsung Galaxy S25 256GB,Celulares,
370bad60-f066-4391-badb-6d074af821ce,Apple IPHONE 16 A3081 128GB BLACK ESIM CHIP VIRTUAL,Celulares,Apple
cell-004,Samsung Galaxy A54 5G 128GB,Celulares,
cell-005,Xiaomi Redmi Note 13 Pro 256GB,Celulares,
a7d1d317-3da1-48d9-8c7f-8885c2d72fe1,Apple IPHONE 16 A3081 128GB TEAL ESIM CHIP VIRTUAL,Celulares,Apple
96461aa0-9cfb-4d9d-b921-972b47437274,Perfume Lattafa Yara EDP 100ml,Perfumaria,
7f57f635-0c6e-4067-a763-22e3a191a824,Perfume Hugo Boss Bottled EDT 100ml,Perfumaria,
8fab92a7-c3a4-4332-b2aa-222be10d5fd0,Perfume Paco Rabanne 1 Million EDT 100ml,Perfumaria,
eb15fe70-8b8c-4833-9f24-e77859f84d26,Perfume Antonio Banderas Blue Seduction EDT 100ml,Perfumaria,
61136d66-b08f-4657-bd58-c69a62eaca3c,Perfume Calvin Klein Eternity EDT 100ml,Perfumaria,
cell-006,Xiaomi 14 Ultra 512GB,Celulares,
cell-007,Google Pixel 8 Pro 256GB,Celulares,
cell-008,OnePlus 12 256GB,Celulares,
cell-009,Motorola Edge 50 Pro 512GB,Celulares,
cell-010,Nothing Phone 2a 256GB,Celulares,
29e1b48b-ee56-4823-a672-4460e41d8ea4,Smartphone Samsung Galaxy A54,Eletrônicos,
cell-011,Huawei P60 Pro 512GB,Celulares,
cell-012,OPPO Find X7 Ultra 256GB,Celulares,
cell-013,Vivo X100 Pro 512GB,Celulares,
cell-014,Realme GT 5 Pro 256GB,Celulares,
cell-015,Honor Magic 6 Pro 512GB,Celulares,
19ca7dca-4f7f-49f8-88a9-fa32a22f18bb,Whisky Johnnie Walker Red Label 750ml,Bebidas,
eed52d09-7497-4312-8698-5b458af17654,Gin Bombay Sapphire 750ml,Bebidas,
elet-001,Notebook Dell I3530-5623BLK-PUS,Eletrônicos,
51438fc0-855f-4aab-9ac4-f641f270d1ec,Fone Bluetooth JBL Tune 510BT,Eletrônicos,
0fc05ece-da90-4961-ab36-4c62ca5790c8,Calça Jeans Masculina,Geral,
4d1bb96c-0780-407b-ab4f-2f06380e93f7,Carregador Portátil 10000mAh,Eletrônicos,
cdf5dc86-3f5a-4b70-b67d-1cb84316631e,"Smart TV 43"" Full HD",Eletrônicos,
elet-002,"Smart TV Samsung 55"" 4K UHD",Eletrônicos,
elet-003,Drone Syma W3 Câmera 2K WiFi GPS,Eletrônicos,
elet-004,MacBook Air M2 256GB,Eletrônicos,
elet-005,"iPad Pro 11"" M4 512GB",Eletrônicos,
elet-006,Sony PlayStation 5 Slim,Eletrônicos,
elet-007,Nintendo Switch OLED 64GB,Eletrônicos,
382988bf-a65b-4bcc-8351-bf1f4f592ba2,Shampoo Anticaspa,Geral,
775f7bac-4e5b-4c0c-911f-e9625ba99138,Perfume New Brand Official EDT 100ml,Perfumaria,
3ec78229-3f4a-47d5-bcac-2d7b193c86be,Perfume Dior Sauvage EDT 100ml,Perfumaria,
47e199d5-82de-4388-b967-c80faa9e6e41,Perfume Carolina Herrera CH EDT 100ml,Perfumaria,
8863fc3a-c258-4634-bbb2-ad21030986d2,Rum Bacardi Carta Blanca 750ml,Bebidas,
cccdc25a-2b4f-433a-a079-22885a9c084d,Termômetro Digital,Geral,
elet-008,Fone JBL Tour Pro 2,Eletrônicos,
3f32e987-db49-4d30-878c-cc2881e2ff62,Protetor Solar FPS 60,Geral,
73287d2f-788f-4196-b5ea-f3fd87d2d223,Vitamina C 1000mg,Geral,
elet-009,Apple Watch Series 9 45mm GPS,Eletrônicos,
b6473179-3cc6-437c-9b90-1b0afc1ce5fa,Notebook Lenovo IdeaPad,Eletrônicos,
c7d8424c-87fc-46b9-b491-aebd34683ef5,Mouse Gamer RGB,Eletrônicos,
75c6b459-7a43-4699-a3d8-8fdbe3fcf809,Teclado Mecânico,Eletrônicos,
a2f21a20-3506-402a-8f53-8883fad36699,Webcam Full HD,Eletrônicos,
68d71999-0671-47c0-bed6-d2967c3d1d17,Jaqueta Jeans Feminina,Geral,
ff07b1b0-3574-40df-8ff9-c66a8b6cc5b0,Bolsa Transversal,Geral,
1104b378-8834-4ba0-9bf7-bb29fa4b7d6c,Óculos de Sol,Geral,
ccaece33-f4ec-494f-b1f3-ca62a5f19ff7,Relógio Feminino,Geral,
c0b0521e-d211-4629-a8e5-2918bbe38322,Sofá 3 Lugares,Geral,
c53d8232-f1f2-41a5-b4cd-24414b220cf5,Tapete Decorativo,Geral,
cadde18a-1301-4806-8ff0-ff8355a3a278,Espelho Grande,Geral,
43149a64-3c70-4d88-8507-0ddb8834eb51,Kit Jardinagem,Geral,
9afe7ebd-0e2d-4e24-b5e1-2580314e2976,Multivitamínico,Geral,
959250af-783c-455a-9d7f-a06d79f16752,Creme Hidratante,Geral,
0377c792-244d-479d-9d8a-a3d28c15da06,iPhone 16 Pro Max,Eletrônicos,
539068ce-9203-46fd-9e6d-60b4a15fd92d,Tênis Esportivo Nike,Geral,
ce3a84f3-29a2-49a9-9ce5-0cb56e13a238,Vaso Decorativo Grande,Geral,
eff9de05-6094-4cfe-adfb-2f972f8b4dd4,Plantas Ornamentais Kit,Geral,
bf7bc6b0-11a5-4f25-9144-f943f74bd6ee,Máscara N95 (Pacote 10un),Geral,
f5e7d6e3-ccad-42a7-af1f-20cbc28baf69,iPhone 16 Pro Max,Eletrônicos,
4d6e444e-f099-4ea5-ab68-7950931c734c,iPhone 16 Pro Max,Eletrônicos,
9484ecaf-742c-4f95-8631-c156a5034326,iPhone 16 Pro Max,Eletrônicos,
2f46d268-8b29-4426-a77d-b1e8fe704c07,Bolsa Couro Italiana Premium,Geral,
2f2dd644-9eb2-4980-b68b-b9e4edf38101,Hot Wheels Pista Super Velocidade,Geral,
e05f1608-9de0-4fee-9b06-157b34bdea07,Quebra-cabeça Disney 1000 peças,Geral,
adf0e793-8a16-48ea-90ff-e18dff96184a,Jogo de Tabuleiro Monopoly,Geral,
738b1e79-5f49-4d15-9e68-50783eb33095,iPhone 15 Pro Max 256GB,Eletrônicos,
e916aaf9-d857-4ffc-81ba-89d9a35b704a,Samsung Galaxy Watch 6,Eletrônicos,
cfec25af-48fd-440a-b953-04e78603fe7f,AirPods Pro 2ª Geração,Eletrônicos,
461b9c5b-e61f-47c8-aee7-94b0922cbbda,"MacBook Air M2 13""",Eletrônicos,
a88f05e5-0812-4116-b8cc-69eb89026785,Sapato Scarpin Salto Alto,Geral,
2a8d508b-6d5d-4a95-bd09-452d464156f9,Conjunto Blazer e Saia Social,Geral,
772cc66e-ac01-44c4-83e5-ade2e766d68f,Kit Jardinagem Completo,Geral,
5bcf7e12-641c-43a2-b6b5-cab723822864,Vaso Decorativo Grande Cerâmica,Geral,
68401f2e-a8d8-4d8f-80d5-723265008f45,Substrato Premium 20kg,Geral,
3698de76-8038-4181-ade2-bf6fc94673cc,Fonte Água Decorativa LED,Geral,
elet-010,Massageador Muscular Joog Massage Gun,Eletrônicos,
fd3480d3-c75f-48c9-adc0-6805318918ef,Vitamina C 1000mg (60 cáps),Geral,
elet-011,"Monitor Gamer ASUS 27"" 144Hz",Eletrônicos,
ecba9723-227d-491e-a6dd-8ec61f77ac02,Boneca Barbie Dreamhouse,Geral,
514776d7-f461-4ca5-82f5-7d3e906daf68,Lego Star Wars Millennium Falcon,Geral,
d2efa245-2e59-4e3b-9b56-4ac80b6fbbac,Vestido Festa Longo Bordado,Geral,
ecc37ce4-cd82-4a9c-9bd9-881f16a7c2ce,Orquídea Phalaenopsis Branca,Geral,
8b743bd3-a3cf-4b3b-8707-532b580a250f,Termômetro Digital Infrared,Geral,
df3106e3-867d-485b-9ea4-e0a1ff0fbd97,Vestido Floral Verão,Geral,
c099c30d-07ca-4196-a0e2-ffb58af52e9a,Blusa Social Feminina,Geral,
e6e21e14-0859-4102-93e5-daf584a32ba0,Conjunto Mesa 4 Cadeiras,Geral,
15d1d977-95f4-4041-8129-5d289fd84c96,Luminária LED Jardim,Geral,
d89b12b6-fe0c-4b9e-bdd7-819307ad2baa,Kit Primeiros Socorros,Geral,
5972a1fb-bf52-4611-b656-4ac7724a84ef,Kit Primeiros Socorros,Geral,
elet-012,Câmera Canon EOS R8,Eletrônicos,
elet-013,Alexa Echo Dot 5ª Geração,Eletrônicos,
elet-014,Teclado Mecânico Razer BlackWidow V4,Eletrônicos,
elet-015,Mouse Logitech MX Master 3S,Eletrônicos,
b1ea2867-a81b-4f2a-91fe-b0fd9b0b7237,Blush Tarte Amazonian Clay Paaarty,Cosméticos,
fc0d7bb6-6c43-4b91-93b7-b3f0eb41a12d,Corretivo NARS Radiant Creamy Concealer,Cosméticos,
3d08e337-bcbe-4120-a4cb-5ffe2dd39d7d,Tequila Jose Cuervo Especial Gold 750ml,Bebidas,
35df44b5-3648-47ce-befd-84b139e9a1a9,Vodka Absolut Original 750ml,Bebidas,
abe9f3bc-614a-4409-8f90-ea1d151937d7,Whisky Jack Daniels Old No.7 750ml,Bebidas,
b14eba4f-9852-4238-8029-6f179e58b8e0,Base Líquida Fenty Beauty Pro Filt'r,Cosméticos,
c8adbec0-d8bc-459d-b8e0-7b76da8c02c6,Paleta de Sombras Urban Decay Naked3,Cosméticos,
d70026ac-69ac-4834-a70e-add01f2c937f,Batom Líquido Kylie Lip Kit Dolce K,Cosméticos,
perf-001,Perfume Lancôme La Vie est Belle EDP 100mL,Perfumes,
perf-002,Perfume Lattafa Asad EDP 100mL Masculino,Perfumes,
perf-003,Perfume Prada Luna Rossa Sport EDT 50mL,Perfumes,
perf-004,Perfume Chanel Coco Mademoiselle EDP 100mL,Perfumes,
perf-005,Perfume Dior Sauvage EDT 100mL,Perfumes,
perf-006,Perfume Versace Bright Crystal EDT 90mL,Perfumes,
perf-007,Perfume Calvin Klein CK One EDT 200mL,Perfumes,
perf-008,Perfume Giorgio Armani Acqua di Gio 100mL,Perfumes,
perf-009,Perfume Yves Saint Laurent Mon Paris EDP 90mL,Perfumes,
perf-010,Perfume Hugo Boss The Scent EDT 100mL,Perfumes,
9971cc1e-7ec0-47fc-a831-acbdde6c5613,Primer Facial Smashbox Photo Finish,Cosméticos,
c144c542-46c3-4c16-b663-01ebda4d3688,Delineador Stila Stay All Day Waterproof,Cosméticos,
1be87046-7885-4e26-ad01-eb5aae808dc3,Perfume Versace Eros EDT 100ml,Perfumaria,
343f83a7-a402-48b9-bec2-c336aa79f9e2,Whisky Chivas Regal 12 Years 750ml,Bebidas,
e7b17d6c-f34a-451c-b441-25bcb110cb88,Flash Speedlite Canon 430EX III-RT,Eletrônica,
98a0934c-20d4-4ea7-8818-06e42fb0782c,Lente Canon EF 50mm f/1.8 STM,Eletrônica,
08df0228-4e5c-4e19-8b6c-9741c9969f40,Cognac Hennessy VS 700ml,Bebidas,
823895c4-f5c8-421c-afb1-32dbf8ed2e9e,Gin Tanqueray London Dry 750ml,Bebidas,
7238b874-de6d-4383-9c88-2bc1bae7b8b5,Protetor Solar FPS 60,Geral,
1089fd03-305e-4a1f-9742-3375da60defb,Máscara de Cílios Too Faced Better Than Sex,Cosméticos,
40f00966-e281-482d-927d-212bbf5937fe,Perfume Giorgio Armani Acqua Di Gio EDT 100ml,Perfumaria,
0cde1e73-4afc-4a39-acf3-1b76e4dbd31b,Champagne Moët & Chandon Brut 750ml,Bebidas,
b97e1717-f004-4ec3-96a3-b2892932f246,Câmera Canon EOS Rebel T7 DSLR,Eletrônica,
5b39eaaf-2ed5-48b5-b729-5a568dbffdfa,Sony Alpha A6000 Mirrorless,Eletrônica,
a5ffcd5b-0d8d-4df7-be08-ea15d13f7e14,DJI Mini 2 Drone 4K,Eletrônica,
9c35915f-1fa2-4dc5-8ee6-0f9712e4f936,Cartão Memoria SanDisk Extreme 64GB,Eletrônica,
c8e2fee4-d90a-44d4-9789-5c8e32d9089a,Microfone Rode VideoMic Pro Plus,Eletrônica,
3bc6a304-f816-4f4a-95eb-cf5009b5c840,Estabilizador DJI Ronin SC,Eletrônica,
75cc9df4-8ef5-44d9-8395-56c02da0a492,Tripé Manfrotto Element MII,Eletrônica,
9bb091c8-5214-430a-8c60-2ed4e088159f,Highlighter Anastasia Beverly Hills Glow Kit,Cosméticos,
cae6c329-ec62-4797-9aed-1fa32d8f7745,Pó Compacto MAC Studio Fix Powder Plus,Cosméticos,
acb3c9e0-6f65-4b2d-8deb-84a2f4583c45,GoPro Hero 11 Black,Eletrônica`;

const OUT = path.resolve("data/canon.json");

const stop = new Set([
  "de","da","do","para","com","sem","e","ou","the","a","an",
  "para","por","con","sin","y","o","la","el","los","las",
  "pro","max","ultra","plus","mini","air","studio","series"
]);

// normaliza PT/ES
function norm(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

// singular simples PT/ES
function singular(w: string) {
  const x = norm(w);
  if (x.endsWith("oes") || x.endsWith("aes")) return x.slice(0, -3) + "ao";
  if (x.endsWith("is")) return x.slice(0, -1) + "l";
  if (x.endsWith("ns")) return x.slice(0, -2) + "m";
  if (x.endsWith("es") && x.length > 4) return x.slice(0, -2);
  if (x.endsWith("s") && x.length > 3) return x.slice(0, -1);
  return x;
}

// tokeniza e remove stopwords
function toks(s: string) { 
  return norm(s).split(" ").filter(t => t && !stop.has(t)); 
}

function headNoun(name: string) {
  // heurística: primeiro token não-marcas/stop + segundo se for número/série
  const ts = toks(name);
  if (!ts.length) return null;
  return singular(ts[0]);
}

function parseCsv(csvText: string) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    data.push(obj);
  }
  
  return data;
}

function build() {
  const raw = parseCsv(csvData);

  const productCanon: Record<string, string> = {};
  const categoryCanon: Record<string, string> = {};
  const productToCategory: Record<string, string> = {};
  const brands = new Set<string>();
  const votes: Record<string, Record<string, number>> = {}; // product -> {cat:count}

  console.log(`🔍 Processando ${raw.length} produtos...`);

  for (const it of raw) {
    const nome = it.name ?? "";
    const cat = singular(it.category ?? "");
    if (!cat) continue;

    categoryCanon[cat] = cat; // canônico
    const h = headNoun(nome);
    if (!h) continue;

    // sinônimos: plural e variações simples do nome
    const tks = toks(nome).map(singular);
    for (const t of tks) {
      if (t.length < 2) continue;
      productCanon[t] = h;
    }

    // votação de categoria por produto canônico
    votes[h] ??= {};
    votes[h][cat] = (votes[h][cat] ?? 0) + 1;

    if (it.brand) brands.add(norm(it.brand));
  }

  // majority vote
  for (const p of Object.keys(votes)) {
    const entry = votes[p];
    const top = Object.entries(entry).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) productToCategory[p] = top;
  }

  const out = {
    productCanon,
    categoryCanon,
    productToCategory,
    brands: Array.from(brands)
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  
  console.log(`✅ canon.json gerado com:`);
  console.log(`   📦 ${Object.keys(productCanon).length} termos de produtos`);
  console.log(`   📂 ${Object.keys(categoryCanon).length} categorias`);
  console.log(`   🏷️ ${Object.keys(productToCategory).length} mapeamentos produto→categoria`);
  console.log(`   🏢 ${brands.size} marcas`);
}

build();