'use strict';

const CLASSIFICATION_FIELDS = [
  'people_visible',
  'safety_helmets_visible',
  'reflective_vests_visible',
  'people_without_helmets_visible',
  'construction_environment',
  'industrial_environment',
];

const CLASSIFICATION_LABELS = {
  people_visible: 'Pessoas visíveis',
  safety_helmets_visible: 'Capacetes de segurança',
  reflective_vests_visible: 'Coletes refletivos',
  people_without_helmets_visible: 'Pessoas sem capacete',
  construction_environment: 'Ambiente de construção',
  industrial_environment: 'Ambiente industrial',
};

const ANNOTATION_STATUSES = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_review', label: 'Em revisão' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' },
];

const ANNOTATION_LABELS = Object.fromEntries(ANNOTATION_STATUSES.map((item) => [item.value, item.label]));

const ERROR_HINTS = {
  INVALID_URL: 'Verifique o endereço informado e tente novamente.',
  UNSUPPORTED_PROTOCOL: 'Somente URLs http:// e https:// são aceitas.',
  BLOCKED_HOST: 'O endereço aponta para uma rede privada, local ou não permitida.',
  UNSUPPORTED_PLATFORM:
    'Use uma página do Pexels, Unsplash ou Wikimedia Commons, ou uma URL direta de imagem.',
  UNSUPPORTED_FORMAT: 'Formatos aceitos: JPEG, PNG, WebP e GIF.',
  INVALID_IMAGE: 'O conteúdo recebido não é uma imagem válida ou está corrompido.',
  DUPLICATE_IMAGE: 'A imagem já existe no dataset. Nenhum arquivo foi gravado novamente.',
  FETCH_FAILED: 'Não foi possível acessar o endereço remoto. Verifique a URL e a conexão.',
  HTTP_ERROR: 'O servidor remoto recusou ou falhou ao responder.',
  RATE_LIMITED: 'Aguarde alguns segundos antes de tentar novamente.',
  DOWNLOAD_TOO_LARGE: 'O arquivo excede o limite configurado para o coletor.',
  PAYLOAD_TOO_LARGE: 'A requisição enviada é grande demais.',
  PREVIEW_EXPIRED: 'A pré-visualização expirou. Extraia a URL novamente.',
  PREVIEW_NOT_FOUND: 'A pré-visualização não existe mais. Extraia a URL novamente.',
  CONFIRM_CONFLICT: 'Houve um conflito ao reservar o nome do arquivo. Tente novamente.',
  CATALOG_WRITE_FAILED: 'Falha ao gravar no catálogo do dataset. Verifique o log do terminal.',
  VALIDATION_ERROR: 'Revise os dados informados e tente novamente.',
  NOT_FOUND: 'O registro solicitado não foi encontrado.',
  METHOD_NOT_ALLOWED: 'Esta operação não é permitida pelo servidor.',
  INTERNAL_ERROR: 'Erro interno do servidor. Verifique o log no terminal.',
};

const state = {
  config: null,
  preview: null,
  previewToken: null,
  confirmBlocked: false,
  records: [],
  search: '',
  annotation: '',
  licensePendingOnly: false,
  detailsFile: null,
};

const $ = (selector, root = document) => root.querySelector(selector);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) {
      continue;
    }
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function safeHttpUrl(value) {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) {
    return '—';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function dimensions(record) {
  const width = Number(record?.width);
  const height = Number(record?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '—';
  }
  return `${width} × ${height} px`;
}

function downloadLabel(status) {
  switch (status) {
    case 'downloaded':
      return 'Baixado';
    case 'downloaded_metadata_pending':
      return 'Metadados pendentes';
    case '':
    case undefined:
    case null:
      return 'Não baixado';
    default:
      return String(status);
  }
}

function classificationStatusLabel(status) {
  switch (status) {
    case 'human_supplied':
      return 'Informado por revisão humana';
    case 'manual_review_required':
      return 'Revisão manual necessária';
    default:
      return status || '—';
  }
}

function setBusy(button, busy, label) {
  if (!button) {
    return;
  }
  button.disabled = busy;
  button.textContent = label;
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });

  let payload = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Falha na requisição (HTTP ${response.status}).`);
    error.code = payload?.error?.code || 'HTTP_ERROR';
    error.details = payload?.error?.details;
    error.status = response.status;
    throw error;
  }
  return payload;
}

function showFeedback(kind, title, message, { hint = '', code = '', detailLines = [] } = {}) {
  const box = $('#feedback');
  box.hidden = false;
  box.className = `feedback feedback--${kind}`;
  box.replaceChildren();
  box.append(el('strong', { text: title }));
  if (message) {
    box.append(el('p', { text: message }));
  }
  if (hint) {
    box.append(el('p', { class: 'feedback__hint', text: hint }));
  }
  if (detailLines.length > 0) {
    box.append(
      el(
        'ul',
        {},
        ...detailLines.filter(Boolean).map((line) => el('li', { text: line })),
      ),
    );
  }
  if (code) {
    box.append(el('p', { class: 'feedback__code', text: `Código: ${code}` }));
  }
}

function showError(title, error) {
  const hint = ERROR_HINTS[error?.code] ?? '';
  const detailLines = [];
  if (error?.details?.fileName) {
    detailLines.push(`Arquivo existente: ${error.details.fileName}`);
  }
  if (error?.details?.untracked) {
    detailLines.push('O arquivo existe na pasta de imagens, mas não está registrado no CSV.');
  }
  showFeedback('error', title, error?.message || 'Ocorreu um erro inesperado.', {
    hint,
    code: error?.code ?? '',
    detailLines,
  });
}

function badge(kind, text) {
  return el('span', { class: `badge badge--${kind}`, text });
}

function setApiStatus(online) {
  const node = $('#api-status');
  node.textContent = online ? 'API local online' : 'API local indisponível';
  node.className = `badge ${online ? 'badge--success' : 'badge--danger'}`;
}

async function checkHealth() {
  try {
    await api('/api/health');
    setApiStatus(true);
  } catch {
    setApiStatus(false);
  }
}

async function loadConfig() {
  try {
    state.config = await api('/api/config');
  } catch {
    state.config = null;
  }
}

/* ------------------------------- Extraction ------------------------------ */

async function discardPreviewToken(token) {
  if (!token) {
    return;
  }
  try {
    await api(`/api/previews/${encodeURIComponent(token)}`, { method: 'DELETE' });
  } catch {
    // Best-effort cleanup; the server expires previews automatically.
  }
}

function resetPreviewPanel() {
  state.preview = null;
  state.previewToken = null;
  state.confirmBlocked = false;

  $('#review-panel').hidden = true;
  $('#duplicate-alert').hidden = true;
  $('#preview-caption').textContent = '';
  const image = $('#preview-image');
  image.removeAttribute('src');
  image.alt = '';
  $('#image-facts').replaceChildren();
  $('#warning-list').replaceChildren();
  $('#classification-fields').replaceChildren();
  $('#meta-source-name').value = '';
  $('#meta-extracted-at').value = '';
  $('#meta-source-url').value = '';
  $('#meta-direct-url').textContent = '';
  $('#confirm-form').reset();
  const confirmButton = $('#confirm-button');
  confirmButton.disabled = false;
  confirmButton.setAttribute('aria-busy', 'false');
}

function appendFact(list, label, value, { mono = false } = {}) {
  list.append(
    el(
      'div',
      {},
      el('dt', { text: label }),
      el('dd', { class: mono ? 'mono' : undefined, text: value || '—' }),
    ),
  );
}

function buildClassificationSelect(id, field, value) {
  const select = el('select', { id, 'data-field': field, 'aria-label': CLASSIFICATION_LABELS[field] });
  select.append(
    el('option', { value: '', text: 'Não revisado' }),
    el('option', { value: 'true', text: 'Sim' }),
    el('option', { value: 'false', text: 'Não' }),
  );
  select.value = value === true ? 'true' : value === false ? 'false' : '';
  return select;
}

function renderPreview(preview) {
  state.preview = preview;
  state.previewToken = preview.token;
  state.confirmBlocked = preview.status === 'duplicate';

  const panel = $('#review-panel');
  panel.hidden = false;

  const image = preview.image ?? {};
  const metadata = preview.metadata ?? {};
  const previewImage = $('#preview-image');
  previewImage.src = image.previewUrl;
  previewImage.alt = image.originalFilename
    ? `Pré-visualização de ${image.originalFilename}`
    : 'Pré-visualização da imagem extraída';

  const captionParts = [
    image.originalFilename || 'Nome original indisponível',
    image.format ? String(image.format).toUpperCase() : '',
    Number.isFinite(Number(image.width)) && Number.isFinite(Number(image.height))
      ? `${image.width} × ${image.height}`
      : '',
  ].filter(Boolean);
  $('#preview-caption').textContent = captionParts.join(' · ');

  const facts = $('#image-facts');
  facts.replaceChildren();
  appendFact(facts, 'Formato', image.format ? `${String(image.format).toUpperCase()} (${image.mimeType})` : '');
  appendFact(facts, 'Dimensões', dimensions(image));
  appendFact(facts, 'Tamanho', formatBytes(image.fileSize));
  appendFact(facts, 'Nome original', image.originalFilename || 'Não identificado');
  appendFact(facts, 'Plataforma', metadata.platformName || metadata.platform || 'Não identificada');
  appendFact(facts, 'Página de origem', metadata.sourcePageUrl || 'Não identificada');
  appendFact(facts, 'SHA-256', image.sha256 || '', { mono: true });
  appendFact(facts, 'Extraído em', formatDate(metadata.extractedAt));

  const warnings = Array.isArray(metadata.warnings) ? metadata.warnings : [];
  const warningList = $('#warning-list');
  warningList.replaceChildren();
  for (const warning of warnings) {
    warningList.append(
      el(
        'div',
        { class: 'warning-item' },
        el('strong', { text: warning.code || 'aviso' }),
        el('span', { text: warning.message || '' }),
      ),
    );
  }

  $('#meta-source-name').value = metadata.platformName || metadata.platform || '';
  $('#meta-extracted-at').value = formatDate(metadata.extractedAt);
  $('#meta-source-url').value = metadata.sourcePageUrl || '';
  $('#meta-direct-url').textContent = metadata.directImageUrl || image.directImageUrl || 'Não identificada';
  $('#meta-author').value = metadata.author || '';
  $('#meta-title').value = metadata.title || '';
  $('#meta-license').value = metadata.license || '';
  $('#meta-license-url').value = metadata.licenseUrl || '';
  $('#meta-notes').value = '';

  const missing = new Set(Array.isArray(metadata.missingFields) ? metadata.missingFields : []);
  for (const marker of document.querySelectorAll('[data-missing-for]')) {
    marker.hidden = !missing.has(marker.dataset.missingFor);
  }

  const classificationFields = $('#classification-fields');
  classificationFields.replaceChildren();
  const suggestions = preview.classification?.suggestions ?? {};
  for (const field of CLASSIFICATION_FIELDS) {
    classificationFields.append(
      el(
        'label',
        { class: 'classification-field' },
        el('span', { text: CLASSIFICATION_LABELS[field] }),
        buildClassificationSelect(`classification-${field}`, field, suggestions[field]),
      ),
    );
  }

  const duplicateAlert = $('#duplicate-alert');
  if (preview.status === 'duplicate' && preview.duplicate) {
    const duplicate = preview.duplicate;
    duplicateAlert.hidden = false;
    duplicateAlert.replaceChildren(
      el('strong', { text: 'Imagem já registrada no dataset. ' }),
      el('span', {
        text: `${duplicate.fileName || 'Arquivo existente'}${
          duplicate.untracked ? ' (arquivo na pasta, sem registro no CSV)' : ''
        }. O download não será duplicado.`,
      }),
    );
  } else {
    duplicateAlert.hidden = true;
    duplicateAlert.replaceChildren();
  }

  const confirmButton = $('#confirm-button');
  confirmButton.disabled = state.confirmBlocked;
  confirmButton.setAttribute('aria-busy', 'false');

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleExtract(event) {
  event.preventDefault();
  const input = $('#url-input');
  const url = input.value.trim();
  if (!url) {
    showFeedback('warning', 'URL obrigatória', 'Informe a URL de uma imagem ou de uma página de origem.');
    input.focus();
    return;
  }

  const previousToken = state.previewToken;
  if (previousToken) {
    resetPreviewPanel();
    discardPreviewToken(previousToken);
  }

  const button = $('#extract-button');
  setBusy(button, true, 'Extraindo…');
  showFeedback(
    'info',
    'Extraindo metadados…',
    'Baixando o arquivo, validando o conteúdo e consultando os metadados públicos. Isso pode levar alguns segundos.',
  );

  try {
    const preview = await api('/api/extract', { method: 'POST', body: { url } });
    renderPreview(preview);

    if (preview.status === 'duplicate') {
      showFeedback(
        'warning',
        'Imagem já registrada',
        'A imagem foi baixada e validada, mas o SHA-256 já existe no dataset. A confirmação está bloqueada.',
      );
    } else {
      const missing = preview.metadata?.missingFields ?? [];
      if (missing.length > 0) {
        showFeedback(
          'warning',
          'Imagem pronta, com metadados pendentes',
          `${missing.length} campo(s) exigem verificação manual antes ou depois do registro. Revise os campos destacados.`,
        );
      } else {
        showFeedback(
          'success',
          'Imagem pronta para revisão',
          'Confira a pré-visualização e os metadados. Nenhum arquivo foi gravado no dataset ainda.',
        );
      }
    }
  } catch (error) {
    resetPreviewPanel();
    showError('Extração falhou', error);
  } finally {
    setBusy(button, false, 'Extrair metadados');
  }
}

function collectClassification(prefix) {
  const result = {};
  for (const field of CLASSIFICATION_FIELDS) {
    const select = document.getElementById(`${prefix}-${field}`);
    if (!select) {
      result[field] = null;
      continue;
    }
    result[field] = select.value === 'true' ? true : select.value === 'false' ? false : null;
  }
  return result;
}

async function handleConfirm(event) {
  event.preventDefault();
  if (!state.previewToken) {
    showFeedback('warning', 'Nenhuma pré-visualização', 'Extraia uma URL antes de confirmar o registro.');
    return;
  }
  if (state.confirmBlocked) {
    showFeedback('warning', 'Confirmação bloqueada', 'Esta imagem já existe no dataset e não pode ser registrada novamente.');
    return;
  }

  const metadata = {
    source_url: $('#meta-source-url').value.trim(),
    author: $('#meta-author').value.trim(),
    title: $('#meta-title').value.trim(),
    license: $('#meta-license').value.trim(),
    license_url: $('#meta-license-url').value.trim(),
    notes: $('#meta-notes').value.trim(),
  };
  const classification = collectClassification('classification');
  const token = state.previewToken;
  const button = $('#confirm-button');
  setBusy(button, true, 'Confirmando…');

  try {
    const result = await api('/api/confirm', {
      method: 'POST',
      body: { token, metadata, classification },
    });
    resetPreviewPanel();
    $('#url-input').value = '';

    const record = result?.record ?? {};
    if (record.download_status === 'downloaded_metadata_pending') {
      showFeedback(
        'warning',
        'Imagem registrada com pendências',
        `O arquivo ${record.file_name} foi salvo em dataset/images/ e catalogado, mas há metadados que exigem verificação manual.`,
        { detailLines: record.notes ? [record.notes] : [] },
      );
    } else {
      showFeedback(
        'success',
        'Imagem registrada',
        `O arquivo ${record.file_name} foi salvo em dataset/images/ e registrado em dataset/sources/image_sources.csv.`,
      );
    }
    await loadRecords();
  } catch (error) {
    if (error.code === 'DUPLICATE_IMAGE') {
      state.confirmBlocked = true;
      const alert = $('#duplicate-alert');
      alert.hidden = false;
      alert.replaceChildren(
        el('strong', { text: 'Imagem já registrada. ' }),
        el('span', {
          text: `${error.details?.fileName || 'Arquivo existente'}. Nenhum arquivo novo foi gravado.`,
        }),
      );
      $('#confirm-button').disabled = true;
    }
    if (error.code === 'PREVIEW_EXPIRED' || error.code === 'PREVIEW_NOT_FOUND') {
      resetPreviewPanel();
    }
    showError('Confirmação falhou', error);
  } finally {
    setBusy(button, false, 'Confirmar download e registro');
    if (state.confirmBlocked) {
      button.disabled = true;
    }
  }
}

async function handleCancel() {
  const token = state.previewToken;
  resetPreviewPanel();
  await discardPreviewToken(token);
  showFeedback('info', 'Revisão cancelada', 'A pré-visualização foi descartada e nenhum arquivo foi gravado.');
}

/* -------------------------------- Catalog -------------------------------- */

function filteredRecords() {
  const term = state.search.trim().toLowerCase();
  return state.records.filter((record) => {
    if (state.annotation && record.annotation_status !== state.annotation) {
      return false;
    }
    if (state.licensePendingOnly && !record.licenseNeedsReview) {
      return false;
    }
    if (!term) {
      return true;
    }
    const haystack = [
      record.file_name,
      record.source_name,
      record.source_url,
      record.direct_image_url,
      record.author,
      record.title,
      record.license,
      record.license_url,
      record.notes,
      record.details?.image?.original_filename,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });
}

function renderStats() {
  const records = state.records;
  const withImage = records.filter((record) => record.download_status?.startsWith('downloaded')).length;
  const pendingMetadata = records.filter(
    (record) => record.download_status === 'downloaded_metadata_pending',
  ).length;
  const licensePending = records.filter((record) => record.licenseNeedsReview).length;
  const approved = records.filter((record) => record.annotation_status === 'approved').length;

  const stats = [
    { label: 'Registros', value: records.length },
    { label: 'Com imagem', value: withImage },
    { label: 'Metadados pendentes', value: pendingMetadata },
    { label: 'Licença a verificar', value: licensePending },
    { label: 'Anotações aprovadas', value: approved },
  ];

  $('#stats').replaceChildren(
    ...stats.map((stat) =>
      el(
        'div',
        { class: 'stat' },
        el('span', { class: 'stat__value', text: String(stat.value) }),
        el('span', { class: 'stat__label', text: stat.label }),
      ),
    ),
  );
}

function thumbnail(record) {
  if (!record.sha256 || !record.file_name) {
    return el('div', { class: 'thumb-placeholder', text: 'sem arquivo' });
  }
  const image = el('img', {
    class: 'thumb',
    src: record.thumbnailUrl,
    alt: `Prévia de ${record.file_name}`,
    loading: 'lazy',
    decoding: 'async',
  });
  image.addEventListener('error', () => {
    image.replaceWith(el('div', { class: 'thumb-placeholder', text: 'indisponível' }));
  });
  return image;
}

function sourceCell(record) {
  const stack = el('div', { class: 'cell-stack' });
  stack.append(el('strong', { text: record.file_name || '—' }));
  if (record.source_name) {
    stack.append(el('span', { text: record.source_name }));
  }
  const link = safeHttpUrl(record.source_url);
  if (link) {
    stack.append(
      el('a', {
        href: link,
        target: '_blank',
        rel: 'noreferrer noopener',
        text: 'Página de origem',
      }),
    );
  } else {
    stack.append(el('span', { class: 'cell-muted', text: 'Sem página de origem' }));
  }
  return stack;
}

function licenseCell(record) {
  if (!record.license) {
    return badge('danger', 'Ausente');
  }
  if (!record.license_url) {
    return badge('warning', 'URL pendente');
  }
  return el('span', { text: record.license, title: record.license_url });
}

function downloadBadge(record) {
  switch (record.download_status) {
    case 'downloaded':
      return badge('success', 'Baixado');
    case 'downloaded_metadata_pending':
      return badge('warning', 'Metadados pendentes');
    case '':
    case undefined:
    case null:
      return badge('neutral-dark', 'Não baixado');
    default:
      return badge('info', downloadLabel(record.download_status));
  }
}

function annotationSelect(record) {
  const select = el('select', {
    class: 'status-select',
    'aria-label': `Status da anotação de ${record.file_name || 'registro'}`,
  });
  for (const status of ANNOTATION_STATUSES) {
    select.append(el('option', { value: status.value, text: status.label }));
  }
  select.value = ANNOTATION_LABELS[record.annotation_status] ? record.annotation_status : 'pending';
  select.addEventListener('change', () => updateAnnotationStatus(record, select));
  return select;
}

async function updateAnnotationStatus(record, select) {
  const previous = record.annotation_status;
  const next = select.value;
  select.disabled = true;
  try {
    const result = await api(`/api/records/${encodeURIComponent(record.file_name)}`, {
      method: 'PATCH',
      body: { annotation_status: next },
    });
    const index = state.records.findIndex((item) => item.file_name === record.file_name);
    if (index >= 0) {
      state.records[index] = {
        ...state.records[index],
        ...result.record,
        licenseNeedsReview: !result.record.license || !result.record.license_url,
      };
    }
    renderStats();
    renderCatalog();
    showFeedback(
      'success',
      'Status da anotação atualizado',
      `${record.file_name}: ${ANNOTATION_LABELS[next] ?? next}.`,
    );
  } catch (error) {
    select.value = previous && ANNOTATION_LABELS[previous] ? previous : 'pending';
    select.disabled = false;
    showError('Falha ao atualizar o status', error);
  }
}

function renderCatalog() {
  const body = $('#catalog-body');
  const empty = $('#catalog-empty');
  const records = filteredRecords();
  body.replaceChildren();

  if (state.records.length === 0) {
    empty.hidden = false;
    empty.textContent = 'Nenhuma imagem registrada ainda. Extraia uma URL para começar.';
    return;
  }
  if (records.length === 0) {
    empty.hidden = false;
    empty.textContent = 'Nenhum registro corresponde aos filtros atuais.';
    return;
  }
  empty.hidden = true;

  for (const record of records) {
    const row = el('tr');
    row.append(
      el('td', {}, thumbnail(record)),
      el('td', {}, sourceCell(record)),
      el(
        'td',
        {},
        record.author
          ? el('span', { text: record.author })
          : el('span', { class: 'cell-muted', text: 'Não informado' }),
      ),
      el('td', {}, licenseCell(record)),
      el('td', {}, el('span', { class: 'cell-muted', text: dimensions(record) })),
      el('td', {}, downloadBadge(record)),
      el('td', {}, annotationSelect(record)),
      el(
        'td',
        {},
        el('button', {
          class: 'button button--ghost',
          type: 'button',
          text: 'Detalhes',
          onclick: () => openDetails(record.file_name),
        }),
      ),
    );
    body.append(row);
  }
}

async function loadRecords() {
  const button = $('#refresh-button');
  setBusy(button, true, 'Atualizando…');
  try {
    const payload = await api('/api/records');
    state.records = Array.isArray(payload?.records) ? payload.records : [];
    renderStats();
    renderCatalog();
  } catch (error) {
    showError('Falha ao carregar o catálogo', error);
  } finally {
    setBusy(button, false, 'Atualizar lista');
  }
}

/* -------------------------------- Details -------------------------------- */

function appendDetail(grid, label, value, { mono = false } = {}) {
  grid.append(
    el(
      'div',
      {},
      el('dt', { text: label }),
      el('dd', { class: mono ? 'mono' : undefined, text: value || '—' }),
    ),
  );
}

function appendDetailLink(grid, label, value) {
  const cell = el('div', {}, el('dt', { text: label }));
  const content = el('dd');
  const link = safeHttpUrl(value);
  if (link) {
    content.append(
      el('a', { href: link, target: '_blank', rel: 'noreferrer noopener', text: link }),
    );
  } else {
    content.textContent = value || '—';
  }
  cell.append(content);
  grid.append(cell);
}

function detailsField(id, label, value, { type = 'text', maxLength = 300, placeholder = '' } = {}) {
  return el(
    'label',
    { class: 'field' },
    el('span', { class: 'field__label', text: label }),
    el('input', {
      id,
      type,
      value: value || '',
      maxlength: String(maxLength),
      placeholder,
    }),
  );
}

function detailsTextarea(id, label, value, maxLength) {
  return el(
    'label',
    { class: 'field' },
    el('span', { class: 'field__label', text: label }),
    el(
      'textarea',
      { id, rows: '3', maxlength: String(maxLength), placeholder: 'Anote decisões, dúvidas ou pendências de licença.' },
      value || '',
    ),
  );
}

function renderDetails(record) {
  const content = $('#details-content');
  content.replaceChildren();
  const details = record.details ?? null;

  const fileSection = el('section', { class: 'details-section' }, el('h3', { text: 'Arquivo e origem' }));
  const grid = el('dl', { class: 'details-grid' });
  appendDetail(grid, 'Arquivo', record.file_name);
  appendDetail(grid, 'Plataforma', record.source_name);
  appendDetailLink(grid, 'Página de origem', record.source_url);
  appendDetailLink(grid, 'URL direta da imagem', record.direct_image_url);
  appendDetail(grid, 'Dimensões', dimensions(record));
  appendDetail(grid, 'Tamanho', record.file_size ? formatBytes(record.file_size) : '');
  appendDetail(grid, 'SHA-256', record.sha256, { mono: true });
  appendDetail(grid, 'Data do download', record.download_date ? formatDate(record.download_date) : '');
  appendDetail(grid, 'Status do download', downloadLabel(record.download_status));
  appendDetail(grid, 'Nome original', details?.image?.original_filename);
  appendDetail(
    grid,
    'Formato',
    details?.image?.format
      ? `${String(details.image.format).toUpperCase()} (${details.image.mime_type || 'tipo desconhecido'})`
      : '',
  );
  fileSection.append(grid);
  content.append(fileSection);

  const metaSection = el('section', { class: 'details-section' }, el('h3', { text: 'Metadados revisáveis' }));
  metaSection.append(
    detailsField('details-source-url', 'Página de origem (URL)', record.source_url, {
      type: 'url',
      maxLength: 2048,
      placeholder: 'https://… (deixe vazio se desconhecida)',
    }),
    detailsField('details-author', 'Autor / fotógrafo', record.author, {
      maxLength: 300,
      placeholder: 'Não identificado',
    }),
    detailsField('details-meta-title', 'Título ou descrição', record.title, {
      maxLength: 500,
      placeholder: 'Não identificado',
    }),
    detailsField('details-license', 'Licença / termos de uso', record.license, {
      maxLength: 300,
      placeholder: 'Não identificada',
    }),
    detailsField('details-license-url', 'URL da licença', record.license_url, {
      type: 'url',
      maxLength: 2048,
      placeholder: 'https://…',
    }),
    detailsTextarea('details-notes', 'Observações', record.notes, 2000),
  );
  content.append(metaSection);

  const classSection = el(
    'section',
    { class: 'details-section' },
    el('h3', { text: 'Características visuais (revisão humana)' }),
  );
  const classGrid = el('div', { class: 'classification-grid' });
  const values = details?.classification?.values ?? {};
  for (const field of CLASSIFICATION_FIELDS) {
    classGrid.append(
      el(
        'label',
        { class: 'classification-field' },
        el('span', { text: CLASSIFICATION_LABELS[field] }),
        buildClassificationSelect(`details-classification-${field}`, field, values[field]),
      ),
    );
  }
  classSection.append(classGrid);
  if (details?.classification?.status) {
    const reviewedAt = details.classification.reviewed_at
      ? ` · revisado em ${formatDate(details.classification.reviewed_at)}`
      : '';
    classSection.append(
      el('p', {
        class: 'classification__note',
        text: `Status: ${classificationStatusLabel(details.classification.status)} · método: ${
          details.classification.method || '—'
        }${reviewedAt}`,
      }),
    );
  }
  content.append(classSection);

  const warnings = details?.extraction?.warnings ?? [];
  const missing = details?.extraction?.missing_fields ?? [];
  if (warnings.length > 0 || missing.length > 0) {
    const warnSection = el('section', { class: 'details-section' }, el('h3', { text: 'Avisos e pendências' }));
    if (missing.length > 0) {
      warnSection.append(
        el('p', { class: 'cell-muted', text: `Verificação manual necessária: ${missing.join(', ')}` }),
      );
    }
    const list = el('div', { class: 'warning-list' });
    for (const warning of warnings) {
      list.append(
        el(
          'div',
          { class: 'warning-item' },
          el('strong', { text: warning.code || 'aviso' }),
          el('span', { text: warning.message || '' }),
        ),
      );
    }
    if (warnings.length === 0) {
      list.append(el('p', { class: 'cell-muted', text: 'Sem avisos registrados.' }));
    }
    warnSection.append(list);
    content.append(warnSection);
  }
}

function openDetails(fileName) {
  const record = state.records.find((item) => item.file_name === fileName);
  if (!record) {
    showFeedback('error', 'Registro não encontrado', 'Atualize a lista e tente novamente.');
    return;
  }
  state.detailsFile = fileName;
  $('#details-title').textContent = `Detalhes — ${fileName}`;
  renderDetails(record);
  const dialog = $('#details-dialog');
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) {
      dialog.showModal();
    }
  } else {
    dialog.setAttribute('open', '');
  }
}

async function handleDetailsSubmit(event) {
  event.preventDefault();
  const fileName = state.detailsFile;
  if (!fileName) {
    return;
  }
  const button = $('#details-save');
  setBusy(button, true, 'Salvando…');
  try {
    const payload = {
      source_url: $('#details-source-url').value.trim(),
      author: $('#details-author').value.trim(),
      title: $('#details-meta-title').value.trim(),
      license: $('#details-license').value.trim(),
      license_url: $('#details-license-url').value.trim(),
      notes: $('#details-notes').value.trim(),
      classification: collectClassification('details-classification'),
    };
    const result = await api(`/api/records/${encodeURIComponent(fileName)}`, {
      method: 'PATCH',
      body: payload,
    });
    const index = state.records.findIndex((item) => item.file_name === fileName);
    if (index >= 0) {
      state.records[index] = {
        ...state.records[index],
        ...result.record,
        licenseNeedsReview: !result.record.license || !result.record.license_url,
      };
    }
    const dialog = $('#details-dialog');
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    state.detailsFile = null;
    renderStats();
    renderCatalog();
    showFeedback('success', 'Registro atualizado', `Os metadados de ${fileName} foram salvos no catálogo.`);
  } catch (error) {
    showError('Falha ao salvar o registro', error);
  } finally {
    setBusy(button, false, 'Salvar alterações');
  }
}

/* --------------------------------- Wiring -------------------------------- */

function bindFieldMarkers() {
  const markers = {
    'meta-author': 'author',
    'meta-title': 'title',
    'meta-license': 'license',
    'meta-license-url': 'license_url',
  };
  for (const [id, field] of Object.entries(markers)) {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      if (!input.value.trim()) {
        return;
      }
      const marker = document.querySelector(`[data-missing-for="${field}"]`);
      if (marker) {
        marker.hidden = true;
      }
    });
  }
}

function init() {
  $('#extract-form').addEventListener('submit', handleExtract);
  $('#confirm-form').addEventListener('submit', handleConfirm);
  $('#cancel-button').addEventListener('click', handleCancel);
  $('#refresh-button').addEventListener('click', loadRecords);

  $('#catalog-search').addEventListener('input', (event) => {
    state.search = event.target.value;
    renderCatalog();
  });
  $('#annotation-filter').addEventListener('change', (event) => {
    state.annotation = event.target.value;
    renderCatalog();
  });
  $('#license-filter').addEventListener('change', (event) => {
    state.licensePendingOnly = event.target.checked;
    renderCatalog();
  });

  $('#details-dialog').addEventListener('submit', handleDetailsSubmit);
  $('#details-close').addEventListener('click', () => {
    const dialog = $('#details-dialog');
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  });
  $('#details-dialog').addEventListener('close', () => {
    state.detailsFile = null;
  });

  bindFieldMarkers();
  checkHealth();
  loadConfig();
  loadRecords();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
