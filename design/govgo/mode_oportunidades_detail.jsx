// Edital detail drawer — slides over from the right within the main column
const { useState: uSod, useEffect: uEod, useRef: uRod } = React;
const EDITAL_DETAIL_CACHE_PREFIX = "govgo.busca.edital-detail.v1:";
const EMPTY_DOCUMENT_VIEW = { status: "idle", summary: "", markdown: "", error: "", markdownPath: "", summaryPath: "", updatedAt: "", cached: false };
const EMPTY_DOCUMENTS_SUMMARY = { status: "idle", summary: "", error: "", updatedAt: "", documentsUsed: 0, cached: false };

function buildMarkdownDownloadName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "documento.md";
  const sanitized = raw.replace(/[<>:"|?*\\\/]+/g, "_");
  if (/\.[a-z0-9]{1,6}$/i.test(sanitized)) {
    return sanitized.replace(/\.[a-z0-9]{1,6}$/i, ".md");
  }
  return `${sanitized}.md`;
}

function downloadMarkdownFile(fileName, content) {
  const markdown = String(content || "");
  if (!markdown.trim() || typeof document === "undefined") return;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = buildMarkdownDownloadName(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}

function readPersistedEditalDetail(pncpId) {
  if (!pncpId || typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${EDITAL_DETAIL_CACHE_PREFIX}${pncpId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function mergePersistedEditalDetail(pncpId, partialState) {
  if (!pncpId || typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const current = readPersistedEditalDetail(pncpId) || {};
    window.localStorage.setItem(
      `${EDITAL_DETAIL_CACHE_PREFIX}${pncpId}`,
      JSON.stringify({
        ...current,
        ...partialState,
      })
    );
  } catch (_) {}
}

function renderInlineMarkdown(text) {
  const source = String(text || "");
  const parts = source.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "0.92em",
            background: "var(--surface-sunk)",
            border: "1px solid var(--hairline-soft)",
            borderRadius: 6,
            padding: "1px 4px",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function MarkdownSummaryView({ content }) {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={`p-${blocks.length}`} style={{margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.8}}>
        {renderInlineMarkdown(paragraph.join(" "))}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} style={{margin: "2px 0 0 18px", padding: 0, display: "grid", gap: 8}}>
        {listItems.map((item, index) => (
          <li key={index} style={{fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.7}}>
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine) => {
    const line = String(rawLine || "").trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const label = headingMatch[2];
      const fontSize = level === 1 ? 17 : level === 2 ? 14.5 : 12.5;
      blocks.push(
        <div
          key={`h-${blocks.length}`}
          style={{
            marginTop: blocks.length ? 8 : 0,
            fontSize,
            fontWeight: 700,
            color: "var(--ink-1)",
            letterSpacing: level === 1 ? "-0.01em" : ".04em",
            textTransform: level === 1 ? "none" : "uppercase",
          }}
        >
          {renderInlineMarkdown(label)}
        </div>
      );
      return;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<div key={`hr-${blocks.length}`} style={{height: 1, background: "var(--hairline)", margin: "4px 0"}}/>);
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();

  return <div style={{display: "grid", gap: 12}}>{blocks}</div>;
}

function EditalDetail({ edital }) {
  const [tab, setTab] = uSod("itens");
  const [titleFontSize, setTitleFontSize] = uSod(20);
  const [itemsState, setItemsState] = uSod({ status: "idle", items: [], error: "" });
  const [docsState, setDocsState] = uSod({ status: "idle", documents: [], error: "" });
  const [documentsSummaryState, setDocumentsSummaryState] = uSod(EMPTY_DOCUMENTS_SUMMARY);
  const [selectedDocumentKey, setSelectedDocumentKey] = uSod("");
  const [documentViews, setDocumentViews] = uSod({});
  const titleRef = uRod(null);
  const itemsCacheRef = uRod({});
  const docsCacheRef = uRod({});
  if (!edital) return null;

  const e = edital;
  const raw = e.raw || {};
  const details = e.details || raw.details || {};
  const firstFilled = (...values) => {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return "";
  };
  const pickDetail = (...keys) => {
    for (const key of keys) {
      const value = details[key] ?? raw[key] ?? e[key];
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return "";
  };
  const rank = Math.max(1, Number(e.rank || 1));
  const rankIndex = Math.min(9, rank - 1);
  const today = new Date();
  const endParts = String(e.end || "").split("/");
  const endDate = endParts.length === 3 ? new Date(endParts.reverse().join("-")) : new Date(e.end || "");
  const daysLeft = Number.isNaN(endDate.getTime()) ? 0 : Math.max(0, Math.round((endDate - today) / 86400000));
  const urgent = daysLeft <= 10;

  // Fake derived data (consistent per rank)
  const pregoeiro = ["Ana Lúcia Ferreira", "Marco Sobral", "Júlia Cardoso", "Heitor Monteiro", "Paulo R. Lima", "Ivana Barreto", "Teresa C. Alves", "André L. Corrêa", "Fernanda M. Ribeiro", "Lucas F. Nogueira"][e.rank - 1];
  const fallbackProcesso = `${(2026).toString()}/${String(e.rank * 137).padStart(6, "0")}`;
  const fallbackEdital = `PE-${String(e.rank * 23).padStart(4, "0")}/2026`;
  const numProcesso = String(firstFilled(
    pickDetail("numero_processo", "numeroProcesso", "processo"),
    fallbackProcesso
  ));
  const editalNumeroBase = firstFilled(
    pickDetail(
      "numero_instrumento_convocatorio",
      "numeroInstrumentoConvocatorio",
      "numero_edital",
      "numeroEdital",
      "numero_compra",
      "numeroCompra",
      "sequencial_compra",
      "sequencialCompra"
    )
  );
  const editalAno = String(firstFilled(pickDetail("ano_compra", "anoCompra"), "")).trim();
  const numEdital = String(
    editalNumeroBase
      ? (String(editalNumeroBase).includes("/") || !editalAno ? editalNumeroBase : `${editalNumeroBase}/${editalAno}`)
      : fallbackEdital
  );
  const pncpId = String(firstFilled(
    pickDetail("numero_controle_pncp", "numeroControlePNCP", "numerocontrolepncp", "numero_controle", "id"),
    e.itemId,
    e.id
  ));
  const persistedDetail = React.useMemo(() => readPersistedEditalDetail(pncpId), [pncpId]);
  const uasg = String(firstFilled(
    pickDetail("unidade_orgao_codigo_unidade", "codigo_unidade", "uasg"),
    String(925000 + e.rank * 13)
  ));
  const esfera = ["Estadual", "Estadual", "Municipal", "Municipal", "Municipal", "Federal", "Municipal", "Federal", "Municipal", "Distrital"][e.rank - 1];
  const sourceLink = String(firstFilled(
    pickDetail("link_sistema_origem", "linkSistemaOrigem", "linksistemaorigem", "url_origem", "urlOrigem", "link"),
    raw.links?.origem
  ));
  const fonte = String(firstFilled(
    pickDetail("fonte", "nome_fonte", "source", "origem"),
    ["PNCP", "ComprasNet", "BLL", "Licitações-e", "PNCP", "ComprasNet", "PNCP", "ComprasNet", "PNCP", "ComprasNet"][e.rank - 1]
  ));

  const objeto = `Registro de preços para aquisição de gêneros alimentícios destinados ao fornecimento de refeições hospitalares e dietas especiais, conforme especificações constantes no Termo de Referência — Anexo I do edital, com entrega parcelada pelo período de 12 (doze) meses.`;

  const objetoReal = e.objeto || details.objeto_compra || e.title || objeto;
  const qtyFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
  const formatItemQty = (value) => {
    if (value === null || value === undefined || value === "") return "\u2014";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return qtyFormatter.format(numeric);
  };
  const formatItemMoney = (value) => {
    if (value === null || value === undefined || value === "") return "\u2014";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "\u2014";
    return fmtBRL(numeric).replace("R$ ", "R$\u202F");
  };
  const itemRows = Array.isArray(itemsState.items)
    ? itemsState.items.map((item, index) => ({
        numero: item.row_number || index + 1,
        descricao: String(item.descricao_item || ""),
        quantidade: formatItemQty(item.quantidade_item),
        valorUnitario: formatItemMoney(item.valor_unitario_estimado),
        valorTotal: formatItemMoney(item.valor_total_estimado),
      }))
    : [];
  const persistedItems = Array.isArray(persistedDetail?.items) ? persistedDetail.items : null;
  const itemCount = itemsState.status === "success"
    ? itemRows.length
    : (persistedItems ? persistedItems.length : (Number(e.items) || 0));

  const normalizeDocumentRecord = (doc, index) => ({
    row_number: doc?.row_number || index + 1,
    nome: String(doc?.nome || doc?.titulo || "Documento"),
    url: String(doc?.url || doc?.uri || ""),
    tipo: String(doc?.tipo || doc?.tipoDocumentoNome || "N/I"),
    tamanho: doc?.tamanho ?? doc?.tamanhoArquivo ?? null,
    modificacao: String(doc?.modificacao || doc?.dataPublicacaoPncp || ""),
    sequencial: doc?.sequencial ?? doc?.sequencialDocumento ?? null,
    origem: String(doc?.origem || "api"),
    has_summary: !!(doc?.has_summary || doc?.hasSummary),
    has_markdown: !!(doc?.has_markdown || doc?.hasMarkdown),
    cached_at: String(doc?.cached_at || doc?.cachedAt || ""),
  });
  const inlineDocumentsSource = Array.isArray(details.lista_documentos)
    ? details.lista_documentos
    : (Array.isArray(raw.lista_documentos) ? raw.lista_documentos : null);
  const inlineDocuments = React.useMemo(
    () => (Array.isArray(inlineDocumentsSource)
      ? inlineDocumentsSource.map(normalizeDocumentRecord)
      : null),
    [pncpId]
  );
  const docSizeFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const formatDocumentSize = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    if (numeric >= 1024 * 1024 * 1024) return `${docSizeFormatter.format(numeric / (1024 * 1024 * 1024))} GB`;
    if (numeric >= 1024 * 1024) return `${docSizeFormatter.format(numeric / (1024 * 1024))} MB`;
    if (numeric >= 1024) return `${docSizeFormatter.format(numeric / 1024)} KB`;
    return `${docSizeFormatter.format(numeric)} B`;
  };
  const formatDocumentDate = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(parsed);
  };
  const getDocumentExtension = (document, artifactView) => {
    const archiveHints = [
      String(document.nome || ""),
      String(document.url || ""),
      String(document.tipo || ""),
      String(artifactView?.markdown || ""),
      String(artifactView?.summary || ""),
    ].join(" ").toLowerCase();
    if (/\brar\b/.test(archiveHints)) return "RAR";
    if (/\b(zip|pkzip|compactad|compactado|compactada)\b/.test(archiveHints)) return "ZIP";

    const fromName = String(document.nome || "").split(".").pop() || "";
    if (fromName && fromName !== document.nome) return fromName.slice(0, 5).toUpperCase();
    const sanitizedUrl = String(document.url || "").split("?")[0];
    const fromUrl = sanitizedUrl.split(".").pop() || "";
    if (fromUrl && fromUrl !== sanitizedUrl) return fromUrl.slice(0, 5).toUpperCase();
    const typeText = String(document.tipo || "").trim();
    const normalizedType = typeText.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const markdownHead = String(artifactView?.markdown || "").slice(0, 220).toLowerCase();

    if (normalizedType === "BRPN") return "PDF";
    if (normalizedType === "EDITAL") return "PDF";
    if (/\bpreg[aã]o eletr[oô]nico\b|\bedital\b|prefeitura|munic[ií]pio/.test(markdownHead)) return "PDF";
    if (!normalizedType && String(artifactView?.markdown || "").trim()) return "PDF";

    return (normalizedType.slice(0, 4) || "PDF").toUpperCase();
  };
  const getDocumentTone = (extension) => {
    if (extension === "PDF") return { bg: "var(--orange-50)", fg: "var(--orange-700)" };
    if (extension === "XLSX" || extension === "XLS") return { bg: "var(--green-50)", fg: "var(--green)" };
    if (extension === "DOC" || extension === "DOCX") return { bg: "var(--blue-50)", fg: "var(--deep-blue)" };
    if (extension === "ZIP" || extension === "RAR") return { bg: "var(--rail)", fg: "var(--ink-2)" };
    return { bg: "var(--rail)", fg: "var(--ink-3)" };
  };
  const documentRows = Array.isArray(docsState.documents)
    ? docsState.documents.map((doc, index) => {
        const key = `${doc.row_number || index + 1}-${doc.url || doc.nome || index}`;
        const artifactView = documentViews[key] || EMPTY_DOCUMENT_VIEW;
        const extension = getDocumentExtension(doc, artifactView);
        return {
          key,
          name: doc.nome || "Documento",
          url: doc.url || "",
          type: doc.tipo || "N/I",
          extension,
          tone: getDocumentTone(extension),
          sizeLabel: formatDocumentSize(doc.tamanho),
          dateLabel: formatDocumentDate(doc.modificacao),
          origem: doc.origem || "",
          hasSummary: !!(doc.has_summary || doc.hasSummary || artifactView.summary),
          hasMarkdown: !!(doc.has_markdown || doc.hasMarkdown || artifactView.markdown || artifactView.markdownPath),
          cachedAt: doc.cached_at || doc.cachedAt || "",
        };
      })
    : [];
  const persistedDocuments = Array.isArray(persistedDetail?.documents) ? persistedDetail.documents : null;
  const docsCount = docsState.status === "success"
    ? documentRows.length
    : (inlineDocuments ? inlineDocuments.length : (persistedDocuments ? persistedDocuments.length : (Number(e.docs) || 0)));
  const persistedDocumentViews = persistedDetail && typeof persistedDetail.documentViews === "object" && persistedDetail.documentViews
    ? persistedDetail.documentViews
    : {};
  const persistedDocumentsSummary = persistedDetail && typeof persistedDetail.documentsSummary === "object" && persistedDetail.documentsSummary
    ? persistedDetail.documentsSummary
    : null;
  const selectedDocument = documentRows.find((document) => document.key === selectedDocumentKey) || documentRows[0] || null;
  const selectedDocumentView = selectedDocument ? (documentViews[selectedDocument.key] || EMPTY_DOCUMENT_VIEW) : EMPTY_DOCUMENT_VIEW;
  const updateDocumentArtifactFlags = (documentUrl, documentName, artifactView) => {
    const hasSummary = !!String(artifactView?.summary || "").trim();
    const hasMarkdown = !!(String(artifactView?.markdown || "").trim() || String(artifactView?.markdownPath || "").trim());
    if (!hasSummary && !hasMarkdown) {
      return;
    }

    const updatedAt = String(artifactView?.updatedAt || artifactView?.updated_at || "");
    const cacheKey = pncpId || "__sem_pncp__";
    const patchDocuments = (documents) => {
      if (!Array.isArray(documents)) {
        return documents;
      }
      return documents.map((document) => {
        const sameUrl = String(document?.url || "") === String(documentUrl || "");
        const sameName = String(document?.nome || document?.titulo || "") === String(documentName || "");
        const matches = documentUrl ? sameUrl : sameName;
        if (!matches) {
          return document;
        }
        return {
          ...document,
          has_summary: hasSummary || !!document?.has_summary,
          has_markdown: hasMarkdown || !!document?.has_markdown,
          cached_at: updatedAt || String(document?.cached_at || ""),
        };
      });
    };

    setDocsState((current) => {
      const nextDocuments = patchDocuments(current.documents);
      if (Array.isArray(nextDocuments)) {
        docsCacheRef.current[cacheKey] = nextDocuments;
        mergePersistedEditalDetail(pncpId, {
          documents: nextDocuments,
          documentsCount: nextDocuments.length,
        });
      }
      return {
        ...current,
        documents: nextDocuments,
      };
    });
  };

  const history = [
    { date: "28/03/2026", event: "Publicação do edital", who: "Pregoeiro", tone: "blue" },
    { date: "02/04/2026", event: "Esclarecimento #1 respondido", who: "Comissão", tone: "default", link: "Item 3.4 — dietas hospitalares" },
    { date: "05/04/2026", event: "Impugnação recebida", who: "Licitante", tone: "orange", link: "Contestação do lote 6" },
    { date: "08/04/2026", event: "Impugnação rejeitada", who: "Comissão", tone: "default" },
    { date: "10/04/2026", event: "Aviso de retificação", who: "Órgão", tone: "orange", link: "Anexo I-A incluído" },
    { date: "14/04/2026", event: "Abertura das propostas", who: "Sistema", tone: "green", future: true },
  ];

  const concorrencia = [
    { cnpj: "14.024.944/0001-03", name: "Vila Vitória Mercantil do Brasil", score: 0.93, hist: 24, win: 0.58 },
    { cnpj: "08.217.761/0001-55", name: "Nutriplus Alimentos Hospitalares", score: 0.88, hist: 18, win: 0.41 },
    { cnpj: "22.554.103/0001-78", name: "Casa da Dieta Distribuidora", score: 0.81, hist: 11, win: 0.37 },
    { cnpj: "31.889.027/0001-12", name: "Prodiet Farmacêutica S.A.", score: 0.77, hist: 42, win: 0.49 },
  ];

  uEod(() => {
    const persistedItemsForPncp = Array.isArray(persistedDetail?.items) ? persistedDetail.items : null;
    itemsCacheRef.current = persistedItemsForPncp ? { [pncpId]: persistedItemsForPncp } : {};
    setItemsState(
      persistedItemsForPncp
        ? { status: "success", items: persistedItemsForPncp, error: "" }
        : { status: "idle", items: [], error: "" }
    );

    const persistedDocsForPncp = Array.isArray(persistedDetail?.documents) ? persistedDetail.documents : null;
    const seededDocs = Array.isArray(inlineDocuments) ? inlineDocuments : persistedDocsForPncp;
    docsCacheRef.current = seededDocs ? { [pncpId || "__sem_pncp__"]: seededDocs } : {};
    setDocsState(
      seededDocs
        ? { status: "success", documents: seededDocs, error: "" }
        : { status: "idle", documents: [], error: "" }
    );

    setDocumentViews(
      persistedDocumentViews && typeof persistedDocumentViews === "object"
        ? persistedDocumentViews
        : {}
    );

    setDocumentsSummaryState(
      persistedDocumentsSummary && typeof persistedDocumentsSummary === "object"
        ? {
            status: persistedDocumentsSummary.summary ? "success" : "idle",
            summary: String(persistedDocumentsSummary.summary || ""),
            error: "",
            updatedAt: String(persistedDocumentsSummary.updatedAt || persistedDocumentsSummary.updated_at || ""),
            documentsUsed: Number(persistedDocumentsSummary.documentsUsed || persistedDocumentsSummary.documents_used || 0),
            cached: true,
          }
        : EMPTY_DOCUMENTS_SUMMARY
    );
    setSelectedDocumentKey("");
  }, [pncpId, persistedDetail, inlineDocuments]);

  uEod(() => {
    const fitTitle = () => {
      const element = titleRef.current;
      if (!element) return;

      const maxSize = 20;
      const minSize = 16;
      let nextSize = maxSize;

      element.style.fontSize = `${maxSize}px`;
      while (nextSize > minSize && element.scrollWidth > element.clientWidth) {
        nextSize -= 0.5;
        element.style.fontSize = `${nextSize}px`;
      }

      setTitleFontSize(nextSize);
    };

    const frameId = window.requestAnimationFrame(fitTitle);
    window.addEventListener("resize", fitTitle);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", fitTitle);
    };
  }, [e.org]);

  uEod(() => {
    if (!documentRows.length) {
      if (selectedDocumentKey) {
        setSelectedDocumentKey("");
      }
      return;
    }
    if (!selectedDocumentKey || !documentRows.some((document) => document.key === selectedDocumentKey)) {
      setSelectedDocumentKey(documentRows[0].key);
    }
  }, [documentRows, selectedDocumentKey]);

  uEod(() => {
    if (tab !== "itens") {
      return;
    }

    if (!pncpId) {
      setItemsState({
        status: "error",
        items: [],
        error: "Este edital nao possui ID PNCP disponivel para carregar os itens.",
      });
      return;
    }

    const cachedItems = itemsCacheRef.current[pncpId];
    if (Array.isArray(cachedItems)) {
      setItemsState({
        status: "success",
        items: cachedItems,
        error: "",
      });
      return;
    }

    const loadEditalItems = window.GovGoSearchApi && window.GovGoSearchApi.loadEditalItems;
    if (typeof loadEditalItems !== "function") {
      setItemsState({
        status: "error",
        items: [],
        error: "A API de itens do edital nao esta disponivel.",
      });
      return;
    }

    let cancelled = false;
    setItemsState({
      status: "loading",
      items: [],
      error: "",
    });

    loadEditalItems({ pncpId, limit: 500 })
      .then((payload) => {
        if (cancelled) return;
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        itemsCacheRef.current[pncpId] = nextItems;
        mergePersistedEditalDetail(pncpId, { items: nextItems, itemsCount: nextItems.length });
        setItemsState({
          status: "success",
          items: nextItems,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setItemsState({
          status: "error",
          items: [],
          error: error?.message || "Nao foi possivel carregar os itens deste edital.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [tab, pncpId]);

  uEod(() => {
    const cacheKey = pncpId || "__sem_pncp__";
    if (Array.isArray(inlineDocuments)) {
      docsCacheRef.current[cacheKey] = inlineDocuments;
      mergePersistedEditalDetail(pncpId, { documents: inlineDocuments, documentsCount: inlineDocuments.length });
      setDocsState({
        status: "success",
        documents: inlineDocuments,
        error: "",
      });
      return;
    }

    const cachedDocuments = docsCacheRef.current[cacheKey];
    if (Array.isArray(cachedDocuments)) {
      setDocsState({
        status: "success",
        documents: cachedDocuments,
        error: "",
      });
    }

    if (!pncpId) {
      setDocsState({
        status: "error",
        documents: [],
        error: "Este edital nao possui ID PNCP disponivel para carregar os documentos.",
      });
      return;
    }

    const loadEditalDocuments = window.GovGoSearchApi && window.GovGoSearchApi.loadEditalDocuments;
    if (typeof loadEditalDocuments !== "function") {
      setDocsState({
        status: "error",
        documents: [],
        error: "A API de documentos do edital nao esta disponivel.",
      });
      return;
    }

    let cancelled = false;
    if (!Array.isArray(cachedDocuments)) {
      setDocsState({
        status: "loading",
        documents: [],
        error: "",
      });
    }

    loadEditalDocuments({ pncpId, limit: 200 })
      .then((payload) => {
        if (cancelled) return;
        const nextDocuments = Array.isArray(payload?.documents)
          ? payload.documents.map(normalizeDocumentRecord)
          : [];
        docsCacheRef.current[cacheKey] = nextDocuments;
        mergePersistedEditalDetail(pncpId, { documents: nextDocuments, documentsCount: nextDocuments.length });
        setDocsState({
          status: "success",
          documents: nextDocuments,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setDocsState({
          status: "error",
          documents: [],
          error: error?.message || "Nao foi possivel carregar os documentos deste edital.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [pncpId, inlineDocuments]);

  uEod(() => {
    if (!pncpId) {
      return;
    }
    if (documentsSummaryState.status === "success" || documentsSummaryState.status === "loading") {
      return;
    }

    const loadEditalDocumentsSummary = window.GovGoSearchApi && window.GovGoSearchApi.loadEditalDocumentsSummary;
    if (typeof loadEditalDocumentsSummary !== "function") {
      return;
    }

    let cancelled = false;
    setDocumentsSummaryState((current) => ({ ...current, status: "loading", error: "" }));

    loadEditalDocumentsSummary({ pncpId, force: false, generateIfMissing: true })
      .then((payload) => {
        if (cancelled) return;
        if (!payload || !payload.summary) {
          setDocumentsSummaryState(EMPTY_DOCUMENTS_SUMMARY);
          return;
        }
        const nextState = {
          status: "success",
          summary: String(payload.summary || ""),
          error: "",
          updatedAt: String(payload.updated_at || payload.updatedAt || ""),
          documentsUsed: Number(payload.documents_used || payload.documentsUsed || 0),
          cached: !!payload.cached,
        };
        mergePersistedEditalDetail(pncpId, { documentsSummary: nextState });
        setDocumentsSummaryState(nextState);
      })
      .catch((error) => {
        if (cancelled) return;
        setDocumentsSummaryState({
          status: "error",
          summary: "",
          error: error?.message || "Nao foi possivel carregar o resumo dos documentos.",
          updatedAt: "",
          documentsUsed: 0,
          cached: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [pncpId]);

  uEod(() => {
    if (!selectedDocument || !pncpId) {
      return;
    }

    const currentView = documentViews[selectedDocument.key];
    if (
      currentView &&
      currentView.status === "success" &&
      (String(currentView.markdown || "").trim() || String(currentView.summary || "").trim() || String(currentView.markdownPath || "").trim())
    ) {
      return;
    }

    const loadEditalDocumentView = window.GovGoSearchApi && window.GovGoSearchApi.loadEditalDocumentView;
    if (typeof loadEditalDocumentView !== "function") {
      setDocumentViews((current) => ({
        ...current,
        [selectedDocument.key]: {
          ...EMPTY_DOCUMENT_VIEW,
          status: "error",
          error: "A API do documento selecionado nao esta disponivel.",
        },
      }));
      return;
    }

    let cancelled = false;
    setDocumentViews((current) => ({
      ...current,
      [selectedDocument.key]: {
        ...(current[selectedDocument.key] || EMPTY_DOCUMENT_VIEW),
        status: "loading",
        error: "",
      },
    }));

    loadEditalDocumentView({
      pncpId,
      documentUrl: selectedDocument.url,
      documentName: selectedDocument.name,
      force: false,
    })
      .then((payload) => {
        if (cancelled) return;
        const nextView = {
          status: "success",
          summary: String(payload.summary || ""),
          markdown: String(payload.markdown || ""),
          error: "",
          markdownPath: String(payload.markdown_path || ""),
          summaryPath: String(payload.summary_path || ""),
          updatedAt: String(payload.updated_at || payload.updatedAt || ""),
          cached: !!payload.cached,
        };
        updateDocumentArtifactFlags(selectedDocument.url, selectedDocument.name, nextView);
        setDocumentViews((current) => {
          const nextState = {
            ...current,
            [selectedDocument.key]: nextView,
          };
          mergePersistedEditalDetail(pncpId, { documentViews: nextState });
          return nextState;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setDocumentViews((current) => ({
          ...current,
          [selectedDocument.key]: {
            ...(current[selectedDocument.key] || EMPTY_DOCUMENT_VIEW),
            status: "error",
            error: error?.message || "Nao foi possivel processar este documento.",
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [pncpId, selectedDocumentKey, selectedDocument && selectedDocument.key]);

  const triggerDocumentsSummary = (force) => {
    const loadEditalDocumentsSummary = window.GovGoSearchApi && window.GovGoSearchApi.loadEditalDocumentsSummary;
    if (typeof loadEditalDocumentsSummary !== "function" || !pncpId) {
      setDocumentsSummaryState({
        status: "error",
        summary: "",
        error: "A API de resumo dos documentos nao esta disponivel.",
        updatedAt: "",
        documentsUsed: 0,
        cached: false,
      });
      return;
    }

    setDocumentsSummaryState((current) => ({
      ...current,
      status: "loading",
      error: "",
    }));

    loadEditalDocumentsSummary({ pncpId, force: !!force, generateIfMissing: true })
      .then((payload) => {
        if (!payload || !payload.summary) {
          setDocumentsSummaryState(EMPTY_DOCUMENTS_SUMMARY);
          return;
        }
        const nextState = {
          status: "success",
          summary: String(payload.summary || ""),
          error: "",
          updatedAt: String(payload.updated_at || payload.updatedAt || ""),
          documentsUsed: Number(payload.documents_used || payload.documentsUsed || 0),
          cached: !!payload.cached,
        };
        mergePersistedEditalDetail(pncpId, { documentsSummary: nextState });
        setDocumentsSummaryState(nextState);
      })
      .catch((error) => {
        setDocumentsSummaryState({
          status: "error",
          summary: "",
          error: error?.message || "Nao foi possivel gerar o resumo dos documentos.",
          updatedAt: "",
          documentsUsed: 0,
          cached: false,
        });
      });
  };

  const triggerSelectedDocumentView = (force) => {
    if (!selectedDocument) {
      return;
    }
    const loadEditalDocumentView = window.GovGoSearchApi && window.GovGoSearchApi.loadEditalDocumentView;
    if (typeof loadEditalDocumentView !== "function") {
      return;
    }

    setDocumentViews((current) => ({
      ...current,
      [selectedDocument.key]: {
        ...(current[selectedDocument.key] || EMPTY_DOCUMENT_VIEW),
        status: "loading",
        error: "",
      },
    }));

    loadEditalDocumentView({
      pncpId,
      documentUrl: selectedDocument.url,
      documentName: selectedDocument.name,
      force: !!force,
    })
      .then((payload) => {
        const nextView = {
          status: "success",
          summary: String(payload.summary || ""),
          markdown: String(payload.markdown || ""),
          error: "",
          markdownPath: String(payload.markdown_path || ""),
          summaryPath: String(payload.summary_path || ""),
          updatedAt: String(payload.updated_at || payload.updatedAt || ""),
          cached: !!payload.cached,
        };
        updateDocumentArtifactFlags(selectedDocument.url, selectedDocument.name, nextView);
        setDocumentViews((current) => {
          const nextState = {
            ...current,
            [selectedDocument.key]: nextView,
          };
          mergePersistedEditalDetail(pncpId, { documentViews: nextState });
          return nextState;
        });
      })
      .catch((error) => {
        setDocumentViews((current) => ({
          ...current,
          [selectedDocument.key]: {
            ...(current[selectedDocument.key] || EMPTY_DOCUMENT_VIEW),
            status: "error",
            error: error?.message || "Nao foi possivel processar este documento.",
          },
        }));
      });
  };

  const openOriginalDocument = (documentItem) => {
    const documentUrl = String(documentItem?.url || "").trim();
    if (!documentUrl) return;
    const anchor = document.createElement("a");
    anchor.href = documentUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.download = "";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const downloadDocumentMarkdown = (documentItem) => {
    if (!documentItem) return;
    const artifactView = documentViews[documentItem.key] || EMPTY_DOCUMENT_VIEW;
    if (String(artifactView.markdown || "").trim()) {
      downloadMarkdownFile(documentItem.name, artifactView.markdown);
    }
  };

  return (
    <div style={{
      background: "var(--workspace)",
      display: "flex", flexDirection: "column",
      height: "100%", minHeight: 0, overflow: "hidden",
    }}>
      {/* Scroll body */}
      <div style={{flex: 1, overflowY: "auto"}}>
        <div style={{padding: "8px 24px 0"}}>

        <div style={{
          background: "var(--paper)",
          border: "1px solid var(--hairline)",
          borderRadius: 16,
          overflow: "hidden",
        }}>

        {/* Hero */}
        <div style={{padding: "10px 16px 6px", background: "var(--paper)", borderBottom: "1px solid var(--hairline)"}}>
          <div style={{display: "flex", alignItems: "flex-start", gap: 10}}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "linear-gradient(135deg, var(--deep-blue), #1F6FD4)",
              color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, letterSpacing: ".02em",
              flexShrink: 0,
            }}>{e.uf}</div>
            <div style={{flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", gap: 14}}>
              <div style={{flex: 1, minWidth: 0}}>
                <h2
                  ref={titleRef}
                  style={{
                    margin: "0 0 3px",
                    fontFamily: "var(--font-display)",
                    fontSize: titleFontSize,
                    color: "var(--ink-1)",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {e.org}
                </h2>
                <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap"}}>
                  <Chip tone="blue">{e.modal}</Chip>
                  <Chip>{esfera}</Chip>
                  <Chip tone={urgent ? "orange" : "default"} icon={<Icon.clock size={10}/>}>{urgent ? `${daysLeft} dias` : `vence em ${daysLeft}d`}</Chip>
                  {e.sim > 0.5 && (
                    <Chip tone="green">{"Alta ader\u00eancia"}</Chip>
                  )}
                </div>
                <div style={{fontSize: 11.75, color: "var(--ink-3)", display: "flex", gap: 7, flexWrap: "wrap"}}>
                  <span style={{display: "inline-flex", alignItems: "center", gap: 5}}><Icon.pin size={11}/>{e.mun} {"\u00b7"} {e.uf}</span>
                  <span>ID PNCP <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{pncpId || "\u2014"}</b></span>
                </div>
              </div>
              <div style={{width: 270, flexShrink: 0, position: "relative", paddingTop: 0, marginRight: 8}}>
                <span style={{position: "absolute", top: 0, right: 0, fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontWeight: 500}}>#{String(e.rank).padStart(2, "0")} no rank</span>
                <div style={{display: "flex", flexDirection: "column", gap: 0, fontSize: 11.75, color: "var(--ink-3)", alignItems: "flex-start", textAlign: "left", paddingRight: 70}}>
                  <span style={{whiteSpace: "nowrap"}}>UASG <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{uasg}</b></span>
                  <span style={{whiteSpace: "nowrap"}}>Processo <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{numProcesso}</b></span>
                  <span style={{whiteSpace: "nowrap"}}>Edital <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{numEdital}</b></span>
                  <span style={{display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"}}>
                    <span>Fonte <b style={{color: "var(--deep-blue)", fontWeight: 600}}>{fonte}</b></span>
                    {sourceLink && (
                      <a
                        href={sourceLink}
                        target="_blank"
                        rel="noreferrer"
                        title={"Abrir licita\u00e7\u00e3o em nova guia"}
                        style={{display: "inline-flex", color: "var(--deep-blue)"}}
                      >
                        <Icon.external size={12}/>
                      </a>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 6,
            background: "var(--paper)",
            borderTop: "1px solid var(--hairline-soft)",
            padding: "6px 0 0",
          }}>
            <div style={{fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "0 0 3px"}}>Objeto</div>
            <p style={{
              margin: 0,
              fontSize: 16.5,
              color: "var(--ink-1)",
              lineHeight: 1.28,
              fontWeight: 500,
              textWrap: "pretty",
              letterSpacing: "-0.01em",
            }}>{objetoReal}</p>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          background: "var(--paper)", borderBottom: "1px solid var(--hairline)",
        }}>
          {[
            { lbl: "Valor estimado", val: e.val === 0 ? "—" : fmtBRL(e.val).replace("R$ ", "R$\u202F"), sub: e.val === 0 ? "sigiloso" : "total do lote", mono: true },
            { lbl: "Encerramento", val: e.end, sub: urgent ? `${daysLeft} dias úteis` : `${daysLeft} dias corridos`, tone: urgent ? "risk" : null, mono: true },
            { lbl: "Itens / Lotes", val: itemCount || "\u2014", sub: `${docsCount} documentos anexados` },
            { lbl: "Similaridade IA", val: e.sim.toFixed(3), sub: "cálculo ponderado", tone: "blue", mono: true },
          ].map((k, i) => (
            <div key={i} style={{
              padding: "9px 18px 8px",
              borderRight: i < 3 ? "1px solid var(--hairline-soft)" : "none",
            }}>
              <div style={{fontSize: 9.8, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 2}}>{k.lbl}</div>
              <div className={k.mono ? "mono" : ""} style={{
                fontSize: 14.75, fontWeight: 600,
                color: k.tone === "risk" ? "var(--risk)" : k.tone === "blue" ? "var(--deep-blue)" : "var(--ink-1)",
                fontFamily: k.mono ? "var(--font-mono)" : "var(--font-display)",
                letterSpacing: k.mono ? "-0.01em" : "-0.015em",
              }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0, padding: "0 16px",
          background: "var(--paper)", borderBottom: "1px solid var(--hairline)",
          position: "sticky", top: 0, zIndex: 2,
        }}>
          {[
            ["itens", "Itens", itemCount || 0],
            ["documentos", "Documentos", docsCount],
            ["resumo", "Resumo", null],
            ["historico", "Histórico", 6],
            ["concorrencia", "Concorrência", 4],
            ["ia", "Análise IA", null],
          ].map(([id, label, count]) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                all: "unset", cursor: "pointer",
                padding: "8px 11px", fontSize: 12.25, fontWeight: active ? 600 : 500,
                color: active ? "var(--ink-1)" : "var(--ink-3)",
                borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
                display: "inline-flex", alignItems: "center", gap: 6,
                marginBottom: -1,
              }}>
                {label}
                {count != null && <span className="mono" style={{fontSize: 10.5, color: "var(--ink-4)", fontWeight: 600}}>{count}</span>}
              </button>
            );
          })}
        </div>
        </div>

        {/* Tab content */}
        <div style={{padding: "20px 0 100px"}}>
          {tab === "resumo" && (
            <div style={{display: "grid", gridTemplateColumns: "1fr 280px", gap: 18}}>
              <div>
                <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "0 0 8px"}}>Resumo dos documentos</div>
                <div style={{
                  background: "var(--paper)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 14,
                  padding: "16px 18px",
                }}>
                  {documentsSummaryState.status === "loading" ? (
                    <div style={{fontSize: 13, color: "var(--ink-3)"}}>Gerando resumo dos documentos...</div>
                  ) : documentsSummaryState.status === "error" ? (
                    <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                      <div style={{fontSize: 13, color: "var(--risk)"}}>{documentsSummaryState.error}</div>
                      <div>
                        <button
                          onClick={() => triggerDocumentsSummary(true)}
                          style={{
                            all: "unset",
                            cursor: "pointer",
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: "var(--orange)",
                            color: "#fff",
                            fontSize: 12.5,
                            fontWeight: 600,
                          }}
                        >
                          Gerar resumo
                        </button>
                      </div>
                    </div>
                  ) : documentsSummaryState.summary ? (
                    <div style={{display: "flex", flexDirection: "column", gap: 14}}>
                      <div style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "var(--blue-50)",
                        border: "1px solid var(--hairline)",
                        fontSize: 12.5,
                        color: "var(--deep-blue)",
                      }}>
                        Sintese automatica dos documentos - revisao humana recomendada
                      </div>
                      <MarkdownSummaryView content={documentsSummaryState.summary}/>
                      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap"}}>
                        <div style={{fontSize: 11.5, color: "var(--ink-3)"}}>
                          {documentsSummaryState.documentsUsed ? `${documentsSummaryState.documentsUsed} documentos analisados` : ""}
                          {documentsSummaryState.updatedAt ? ` • atualizado em ${documentsSummaryState.updatedAt}` : ""}
                        </div>
                        <button
                          onClick={() => triggerDocumentsSummary(true)}
                          style={{
                            all: "unset",
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: 999,
                            border: "1px solid var(--hairline)",
                            color: "var(--deep-blue)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Atualizar resumo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                      <div style={{fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6}}>
                        Ainda nao existe um resumo consolidado dos documentos deste edital.
                      </div>
                      <div>
                        <button
                          onClick={() => triggerDocumentsSummary(true)}
                          style={{
                            all: "unset",
                            cursor: "pointer",
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: "var(--orange)",
                            color: "#fff",
                            fontSize: 12.5,
                            fontWeight: 600,
                          }}
                        >
                          Gerar resumo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <aside style={{display: "flex", flexDirection: "column", gap: 12}}>
                <SideBlock title="Cronograma">
                  {[
                    ["28/03", "Publicação", "default"],
                    ["08/04", "Limite impugnação", "default"],
                    ["12/04", "Limite esclarecimentos", "default"],
                    [e.end.slice(0, 5), "Abertura propostas", "orange"],
                    ["18/04", "Sessão pública", "default"],
                  ].map(([d, t, tone], i) => (
                    <div key={i} style={{display: "grid", gridTemplateColumns: "54px 1fr", gap: 8, padding: "5px 0", fontSize: 12.5, borderTop: i ? "1px solid var(--hairline-soft)" : "none"}}>
                      <span className="mono" style={{color: "var(--ink-3)", fontWeight: 500}}>{d}</span>
                      <span style={{color: tone === "orange" ? "var(--orange-700)" : "var(--ink-2)", fontWeight: tone === "orange" ? 600 : 400}}>{t}</span>
                    </div>
                  ))}
                </SideBlock>

                <SideBlock title="Responsáveis">
                  <div style={{fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6}}>
                    <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 2}}>
                      <div style={{width: 22, height: 22, borderRadius: "50%", background: "var(--orange-50)", color: "var(--orange-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700}}>{pregoeiro.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
                      <span style={{fontWeight: 500}}>{pregoeiro}</span>
                    </div>
                    <div style={{fontSize: 11.5, color: "var(--ink-3)", marginLeft: 28}}>Pregoeiro — autoridade signatária</div>
                  </div>
                </SideBlock>

                <SideBlock title="Aderência histórica">
                  <div style={{fontSize: 12.5, color: "var(--ink-2)"}}>
                    <div style={{display: "flex", justifyContent: "space-between", padding: "3px 0"}}>
                      <span>Com {e.org.split(" ").slice(0, 2).join(" ")}</span>
                      <span className="mono" style={{fontWeight: 600, color: "var(--deep-blue)"}}>4 contratos</span>
                    </div>
                    <div style={{display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: "1px solid var(--hairline-soft)"}}>
                      <span>Valor ganho</span>
                      <span className="mono" style={{fontWeight: 600}}>R$ 2,1 mi</span>
                    </div>
                    <div style={{display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: "1px solid var(--hairline-soft)"}}>
                      <span>Taxa de vitória</span>
                      <span className="mono" style={{fontWeight: 600, color: "var(--green)"}}>62%</span>
                    </div>
                  </div>
                </SideBlock>
              </aside>
            </div>
          )}

          {tab === "itens" && (
            <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden"}}>
              {itemsState.status === "loading" ? (
                <div style={{padding: "26px 18px", fontSize: 13, color: "var(--ink-3)"}}>
                  Carregando itens do edital...
                </div>
              ) : itemsState.status === "error" ? (
                <div style={{padding: "26px 18px", fontSize: 13, color: "var(--risk)"}}>
                  {itemsState.error}
                </div>
              ) : itemRows.length === 0 ? (
                <div style={{padding: "26px 18px", fontSize: 13, color: "var(--ink-3)"}}>
                  Nenhum item encontrado para este edital.
                </div>
              ) : (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) 120px 136px 150px",
                    padding: "10px 16px", background: "var(--rail)",
                    fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600,
                    borderBottom: "1px solid var(--hairline)",
                  }}>
                    <span>{"N\u00ba"}</span>
                    <span>{"Descri\u00e7\u00e3o"}</span>
                    <span>Qtde</span>
                    <span style={{textAlign: "right"}}>{"Unit (R$)"}</span>
                    <span style={{textAlign: "right"}}>{"Total (R$)"}</span>
                  </div>
                  {itemRows.map((item, index) => (
                    <div key={`${item.numero}-${index}`} style={{
                      display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) 120px 136px 150px",
                      padding: "11px 16px", fontSize: 12.5, alignItems: "start",
                      borderBottom: index < itemRows.length - 1 ? "1px solid var(--hairline-soft)" : "none",
                    }}>
                      <span className="mono" style={{color: "var(--ink-3)", fontWeight: 500}}>{String(item.numero).padStart(2, "0")}</span>
                      <span style={{color: "var(--ink-1)", lineHeight: 1.45}}>{item.descricao || "\u2014"}</span>
                      <span className="mono" style={{color: "var(--ink-2)"}}>{item.quantidade}</span>
                      <span className="mono" style={{color: "var(--ink-2)", textAlign: "right"}}>{item.valorUnitario}</span>
                      <span className="mono" style={{color: "var(--ink-1)", fontWeight: 600, textAlign: "right"}}>{item.valorTotal}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "documentos" && (
            <div style={{background: "var(--workspace)"}}>
              {docsState.status === "loading" ? (
                <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "26px 18px", fontSize: 13, color: "var(--ink-3)"}}>
                  Carregando documentos do edital...
                </div>
              ) : docsState.status === "error" ? (
                <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "26px 18px", fontSize: 13, color: "var(--risk)"}}>
                  {docsState.error}
                </div>
              ) : documentRows.length === 0 ? (
                <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "26px 18px", fontSize: 13, color: "var(--ink-3)"}}>
                  Nenhum documento encontrado para este edital.
                </div>
              ) : (
                <div style={{
                  background: "var(--paper)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "grid",
                  gridTemplateColumns: "280px minmax(0, 1fr)",
                  height: "calc(100vh - 24px)",
                  maxHeight: "calc(100vh - 24px)",
                  position: "sticky",
                  top: 12,
                }}>
                  <aside style={{borderRight: "1px solid var(--hairline)", background: "var(--surface-sunk)", display: "flex", flexDirection: "column", minHeight: 0}}>
                    <div style={{padding: "14px 14px 10px", borderBottom: "1px solid var(--hairline)"}}>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700}}>
                        ARQUIVOS
                      </div>
                    </div>

                    <div style={{flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: 10, display: "flex", flexDirection: "column", gap: 8}}>
                      {documentRows.length === 0 ? (
                        <div style={{padding: "18px 12px", fontSize: 12.5, color: "var(--ink-3)"}}>
                          Nenhum documento encontrado.
                        </div>
                      ) : (
                        documentRows.map((document) => {
                          const active = selectedDocument && selectedDocument.key === document.key;
                          return (
                            <div
                              key={document.key}
                              onClick={() => setSelectedDocumentKey(document.key)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedDocumentKey(document.key);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              style={{
                                all: "unset",
                                cursor: "pointer",
                                display: "flex",
                                gap: 12,
                                padding: "10px 10px",
                                borderRadius: 10,
                                border: active ? "1px solid var(--orange)" : "1px solid transparent",
                                background: active ? "var(--orange-50)" : "transparent",
                                boxShadow: active ? "inset 2px 0 0 var(--orange)" : "none",
                              }}
                            >
                              <div style={{
                                width: 34,
                                height: 40,
                                flexShrink: 0,
                                background: document.tone.bg,
                                color: document.tone.fg,
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: ".04em",
                              }}>{document.extension}</div>
                              <div style={{flex: 1, minWidth: 0, textAlign: "left"}}>
                                <div style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--ink-1)",
                                  lineHeight: 1.28,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}>{document.name}</div>
                                <div style={{fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap"}}>
                                  {document.sizeLabel && <span>{document.sizeLabel}</span>}
                                  {document.dateLabel && <><span>{"\u00b7"}</span><span>{document.dateLabel}</span></>}
                                </div>
                              </div>
                              <div style={{display: "flex", flexDirection: "column", gap: 6, alignItems: "center", justifyContent: "center", flexShrink: 0}}>
                                <button
                                  title="Baixar arquivo original"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openOriginalDocument(document);
                                  }}
                                  style={{
                                    all: "unset",
                                    cursor: document.url ? "pointer" : "default",
                                    width: 24,
                                    height: 24,
                                    borderRadius: 7,
                                    border: "1px solid var(--hairline)",
                                    background: "var(--paper)",
                                    color: "var(--ink-2)",
                                    opacity: document.url ? 1 : 0.35,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Icon.download size={12}/>
                                </button>
                                <button
                                  title={document.hasMarkdown ? "Baixar markdown" : "Markdown ainda indisponivel"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    downloadDocumentMarkdown(document);
                                  }}
                                  style={{
                                    all: "unset",
                                    cursor: document.hasMarkdown ? "pointer" : "default",
                                    width: 24,
                                    height: 24,
                                    borderRadius: 7,
                                    border: "1px solid var(--hairline)",
                                    background: "var(--paper)",
                                    color: "var(--deep-blue)",
                                opacity: document.hasMarkdown ? 1 : 0.35,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                                >
                                  <Icon.terminal size={12}/>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </aside>

                  <div style={{display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0}}>
                    {selectedDocument ? (
                      <>
                        <div style={{flex: 1, minHeight: 0, background: "var(--workspace)", padding: 14, overflow: "hidden"}}>
                          <div style={{
                            height: "100%",
                            background: "var(--paper)",
                            border: "1px solid var(--hairline)",
                            borderRadius: 12,
                            padding: 16,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}>
                            {selectedDocumentView.status === "loading" ? (
                              <div style={{fontSize: 13, color: "var(--ink-3)"}}>Gerando markdown do documento...</div>
                            ) : selectedDocumentView.status === "error" ? (
                              <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                                <div style={{fontSize: 13, color: "var(--risk)"}}>{selectedDocumentView.error}</div>
                                <div>
                                  <button
                                    onClick={() => triggerSelectedDocumentView(true)}
                                    style={{
                                      all: "unset",
                                      cursor: "pointer",
                                      padding: "10px 14px",
                                      borderRadius: 10,
                                      background: "var(--orange)",
                                      color: "#fff",
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Tentar novamente
                                  </button>
                                </div>
                              </div>
                            ) : selectedDocumentView.markdown ? (
                              <>
                                <div style={{
                                  padding: "10px 12px",
                                  borderRadius: 10,
                                  background: "var(--blue-50)",
                                  border: "1px solid var(--hairline)",
                                  fontSize: 12.5,
                                  color: "var(--deep-blue)",
                                }}>
                                  Markdown gerado automaticamente para o documento selecionado
                                  {selectedDocumentView.updatedAt ? ` • atualizado em ${selectedDocumentView.updatedAt}` : ""}
                                </div>
                                <div style={{
                                  flex: 1,
                                  minHeight: 0,
                                  borderRadius: 10,
                                  border: "1px solid var(--hairline)",
                                  background: "var(--workspace)",
                                  padding: "16px 18px",
                                  fontSize: 12.5,
                                  color: "var(--ink-2)",
                                  lineHeight: 1.7,
                                  whiteSpace: "pre-wrap",
                                  overflowY: "auto",
                                  overscrollBehavior: "contain",
                                }}>
                                  {selectedDocumentView.markdown}
                                </div>
                              </>
                            ) : (
                              <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                                <div style={{fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7}}>
                                  Preparando a transcricao em Markdown deste documento.
                                </div>
                                <div>
                                  <button
                                    onClick={() => triggerSelectedDocumentView(true)}
                                    style={{
                                      all: "unset",
                                      cursor: "pointer",
                                      padding: "10px 14px",
                                      borderRadius: 10,
                                      background: "var(--orange)",
                                      color: "#fff",
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Reprocessar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{padding: "26px 18px", fontSize: 13, color: "var(--ink-3)"}}>
                        Nenhum documento selecionado nesse filtro.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "historico" && (
            <div style={{position: "relative", paddingLeft: 20}}>
              <div style={{position: "absolute", left: 6, top: 6, bottom: 6, width: 1, background: "var(--hairline)"}}/>
              {history.map((h, i) => (
                <div key={i} style={{position: "relative", paddingBottom: 14}}>
                  <div style={{
                    position: "absolute", left: -18, top: 4, width: 11, height: 11, borderRadius: "50%",
                    background: h.future ? "var(--paper)" : h.tone === "orange" ? "var(--orange)" : h.tone === "blue" ? "var(--deep-blue)" : h.tone === "green" ? "var(--green)" : "var(--ink-3)",
                    border: h.future ? "2px dashed var(--ink-4)" : "none",
                  }}/>
                  <div style={{display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap"}}>
                    <span className="mono" style={{fontSize: 11.5, fontWeight: 600, color: h.future ? "var(--ink-4)" : "var(--ink-2)"}}>{h.date}</span>
                    <span style={{fontSize: 13, fontWeight: h.future ? 400 : 500, color: h.future ? "var(--ink-3)" : "var(--ink-1)"}}>{h.event}</span>
                    <span style={{fontSize: 11.5, color: "var(--ink-3)"}}>· {h.who}</span>
                  </div>
                  {h.link && <div style={{fontSize: 12, color: "var(--deep-blue)", marginTop: 2, paddingLeft: 0}}>{h.link}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === "concorrencia" && (
            <div>
              <p style={{margin: "0 0 12px", fontSize: 12.5, color: "var(--ink-3)"}}>Fornecedores detectados com histórico neste órgão ou objeto similar.</p>
              <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden"}}>
                {concorrencia.map((c, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 140px 110px 110px 40px",
                    padding: "12px 16px", alignItems: "center",
                    borderBottom: i < concorrencia.length - 1 ? "1px solid var(--hairline-soft)" : "none",
                    background: i === 0 ? "var(--orange-50)" : "var(--paper)",
                  }}>
                    <div style={{minWidth: 0}}>
                      <div style={{fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{c.name}</div>
                      <div className="mono" style={{fontSize: 11, color: "var(--deep-blue)", marginTop: 2}}>{c.cnpj}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Aderência</div>
                      <ScoreDot score={c.score}/>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Contratos</div>
                      <div className="mono" style={{fontSize: 13, fontWeight: 600, color: "var(--ink-1)"}}>{c.hist}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Taxa vit.</div>
                      <div className="mono" style={{fontSize: 13, fontWeight: 600, color: c.win >= 0.5 ? "var(--green)" : "var(--ink-1)"}}>{Math.round(c.win * 100)}%</div>
                    </div>
                    <button style={{all: "unset", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "inline-flex", justifySelf: "end"}}><Icon.external size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "ia" && (
            <div style={{
              background: "linear-gradient(135deg, rgba(31, 111, 212, .04), rgba(255, 87, 34, .04))",
              border: "1px solid var(--hairline)", borderRadius: 12, padding: 18,
            }}>
              <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 12}}>
                <div style={{width: 30, height: 30, borderRadius: 8, background: "var(--deep-blue)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center"}}><Icon.sparkle size={14}/></div>
                <div>
                  <div style={{fontSize: 14, fontWeight: 600, color: "var(--ink-1)"}}>Análise estratégica gerada</div>
                  <div style={{fontSize: 11.5, color: "var(--ink-3)"}}>Atualizada há 4 minutos · revisão humana recomendada</div>
                </div>
              </div>
              <div style={{fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.65, textWrap: "pretty"}}>
                Este pregão apresenta <b style={{color: "var(--ink-1)"}}>alta aderência ({(e.sim * 100).toFixed(1)}%)</b> ao seu perfil,
                com objeto centrado em dietas hospitalares — categoria na qual sua empresa tem <b style={{color: "var(--ink-1)"}}>62% de taxa de vitória nos últimos 18 meses</b>.
                O valor estimado ({e.val > 0 ? fmtBRL(e.val).replace("R$ ", "R$\u202F") : "sigiloso"}) coloca a licitação no topo 12% por porte,
                e a modalidade Pregão Eletrônico é favorável ao seu histórico operacional.
                <br/><br/>
                <b style={{color: "var(--orange-700)"}}>Pontos de atenção:</b> o lote 6 (água estéril) sai fora do seu CNAE principal e
                historicamente a Prodiet domina 49% dessa linha no Centro-Oeste — considere apresentar proposta apenas para os lotes 1 a 5.
                O prazo de entrega de 7 dias é mais apertado que sua mediana — valide com logística antes da sessão.
              </div>
              <div style={{display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap"}}>
                <Button size="sm" kind="ghost" icon={<Icon.sparkle size={12}/>}>Regenerar</Button>
                <Button size="sm" kind="ghost" icon={<Icon.download size={12}/>}>Copiar</Button>
                <Button size="sm" kind="ghost" icon={<Icon.external size={12}/>}>Enviar ao time</Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Sticky footer actions */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 20px", background: "var(--paper)",
        borderTop: "1px solid var(--hairline)",
      }}>
        <Button kind="ghost" size="sm" icon={<Icon.bookmark size={13}/>}>Salvar</Button>
        <Button kind="ghost" size="sm" icon={<Icon.bell size={13}/>}>Acompanhar</Button>
        <Button kind="ghost" size="sm" icon={<Icon.external size={13}/>}>Compartilhar</Button>
        <span style={{flex: 1}}/>
        <Button
          kind="ghost"
          size="sm"
          icon={<Icon.external size={13}/>}
          disabled={!sourceLink}
          onClick={() => {
            if (sourceLink) {
              window.open(sourceLink, "_blank", "noopener,noreferrer");
            }
          }}
        >
          Abrir no {fonte}
        </Button>
        <Button kind="primary" size="sm" icon={<Icon.sparkle size={13}/>}>Analisar com IA</Button>
      </div>
    </div>
  );
}

function SideBlock({ title, children }) {
  return (
    <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "12px 14px"}}>
      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 8}}>{title}</div>
      {children}
    </div>
  );
}

window.EditalDetail = EditalDetail;
