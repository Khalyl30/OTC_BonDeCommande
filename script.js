const STORAGE_KEY = 'otc-order-form-draft';
const ITEMS_PER_PAGE = 42;
const ITEMS_PER_TABLE = 21;
const STATUS_HIDE_DELAY_MS = 2200;
const TODAY = new Date().toISOString().split('T')[0];
const APP_FONT_STACK = "'Inter', sans-serif";

const UI_TEXT = {
    clearConfirm: 'Réinitialiser le formulaire et supprimer le brouillon enregistré ?',
    clearSuccess: 'Formulaire réinitialisé.',
    download: 'Télécharger',
    draftSaved: 'Brouillon enregistré.',
    emptyReferences: 'Ajoutez au moins une référence avant de créer le bon de commande.',
    generateBusy: 'Génération en cours...',
    generateDefault: 'Générer bon de commande',
    generateSuccess: 'Le bon de commande a été généré avec succès.'
};

const COMPANY_INFO_HTML = `
    <p style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.14em; line-height: 1;">O.T.C</p>
    <p style="margin: 2px 0 0; font-size: 19px; font-weight: 800;">Optical Trade Company</p>
    <p style="margin: 8px 0 0; font-size: 13px; line-height: 1.55;">
        4 Av. Taieb Mhiri App. N°2 - 2080 ARIANA<br>
        Tél : 00 216 29 808 579 / SAV : 29 760 935<br>
        E-mail : opticaltrade.company@gmail.com
    </p>
`;

const REFERENCE_ITEM_HTML = `
    <input type="text" class="reference" placeholder="Référence">
    <div class="quantity-control">
        <button type="button" class="quantity-btn decrement" aria-label="Diminuer la quantité">-</button>
        <input type="number" class="quantity" min="1" value="1" inputmode="numeric">
        <button type="button" class="quantity-btn increment" aria-label="Augmenter la quantité">+</button>
    </div>
    <input type="text" class="discount" placeholder="Remise">
`;

document.addEventListener('DOMContentLoaded', function() {
    const elements = getElements();
    const state = {
        isVirtualKeyboardVisible: detectVirtualKeyboardVisibility(),
        lastFocusedItem: null,
        keyboardAnchorInput: null,
        statusTimeoutId: null
    };

    initializeForm(elements);
    bindEvents(elements, state);
});

function getElements() {
    return {
        addReferenceBtn: document.getElementById('addReference'),
        clearFormBtn: document.getElementById('clearForm'),
        clientAddress: document.getElementById('clientAddress'),
        clientEmail: document.getElementById('clientEmail'),
        clientName: document.getElementById('clientName'),
        formStatus: document.getElementById('formStatus'),
        generatedList: document.getElementById('generatedList'),
        generatedResults: document.getElementById('generatedResults'),
        managerPhone: document.getElementById('managerPhone'),
        orderDateInput: document.getElementById('orderDate'),
        orderForm: document.getElementById('orderForm'),
        referencesContainer: document.getElementById('referencesContainer'),
        salesAgent: document.getElementById('salesAgent'),
        submitBtn: document.getElementById('generateOrder'),
        totalQuantity: document.getElementById('totalQuantity')
    };
}

function initializeForm(elements) {
    setDefaultDate(elements);
    restoreDraft(elements);
    updateTotalQuantity(elements);
}

function bindEvents(elements, state) {
    bindViewportTracking(state);

    elements.referencesContainer.addEventListener('pointerdown', function(event) {
        handleQuantityButtonPointerDown(event);
    });

    elements.referencesContainer.addEventListener('click', function(event) {
        handleReferenceContainerClick(event, elements, state);
    });

    elements.referencesContainer.addEventListener('focusin', function(event) {
        handleFocusIn(event, state);
    });

    elements.referencesContainer.addEventListener('focusout', function(event) {
        handleFocusOut(event, state);
    });

    elements.orderForm.addEventListener('input', function(event) {
        handleFormInput(event, elements, state);
    });

    elements.addReferenceBtn.addEventListener('click', function() {
        handleAddReference(elements, state);
    });

    elements.clearFormBtn.addEventListener('click', function() {
        handleClearForm(elements, state);
    });

    elements.orderForm.addEventListener('submit', function(event) {
        handleSubmit(event, elements, state);
    });
}

function setDefaultDate(elements) {
    elements.orderDateInput.value = TODAY;
}

function createReferenceItem() {
    const referenceItem = document.createElement('div');
    referenceItem.className = 'reference-item';
    referenceItem.innerHTML = REFERENCE_ITEM_HTML;
    return referenceItem;
}

function getReferenceItems(elements) {
    return Array.from(elements.referencesContainer.querySelectorAll('.reference-item'));
}

function getReferenceFields(item) {
    return {
        reference: item.querySelector('.reference'),
        quantity: item.querySelector('.quantity'),
        discount: item.querySelector('.discount')
    };
}

function updateTotalQuantity(elements) {
    const total = getReferenceItems(elements).reduce(function(sum, item) {
        const quantityValue = parseInt(getReferenceFields(item).quantity.value, 10);
        return sum + (Number.isNaN(quantityValue) ? 0 : quantityValue);
    }, 0);

    elements.totalQuantity.textContent = String(total);
}

function toggleGeneratedResults(elements, visible) {
    elements.generatedResults.hidden = !visible;
}

function clearGeneratedResults(elements) {
    elements.generatedList.innerHTML = '';
    toggleGeneratedResults(elements, false);
}

function showStatusMessage(elements, state, message, tone) {
    elements.formStatus.textContent = message;
    elements.formStatus.dataset.tone = tone || 'neutral';

    if (state.statusTimeoutId) {
        window.clearTimeout(state.statusTimeoutId);
    }

    state.statusTimeoutId = window.setTimeout(function() {
        elements.formStatus.textContent = '';
        elements.formStatus.dataset.tone = '';
    }, STATUS_HIDE_DELAY_MS);
}

function resetFormState(elements, state) {
    elements.orderForm.reset();
    setDefaultDate(elements);
    elements.referencesContainer.innerHTML = '';
    elements.referencesContainer.appendChild(createReferenceItem());
    clearGeneratedResults(elements);
    state.lastFocusedItem = null;
    state.keyboardAnchorInput = null;
    updateTotalQuantity(elements);
}

function serializeReferences(elements) {
    return getReferenceItems(elements).map(function(item) {
        const fields = getReferenceFields(item);
        return {
            reference: fields.reference.value,
            quantity: fields.quantity.value,
            discount: fields.discount.value
        };
    });
}

function getDraftData(elements) {
    return {
        orderDate: elements.orderDateInput.value,
        clientName: elements.clientName.value,
        clientAddress: elements.clientAddress.value,
        clientEmail: elements.clientEmail.value,
        salesAgent: elements.salesAgent.value,
        managerPhone: elements.managerPhone.value,
        references: serializeReferences(elements)
    };
}

function saveDraft(elements, state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getDraftData(elements)));
    showStatusMessage(elements, state, UI_TEXT.draftSaved, 'success');
}

function restoreDraft(elements) {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (!savedDraft) {
        return;
    }

    try {
        const draft = JSON.parse(savedDraft);
        elements.orderDateInput.value = draft.orderDate || TODAY;
        elements.clientName.value = toTitleCase(draft.clientName || '');
        elements.clientAddress.value = toTitleCase(draft.clientAddress || '');
        elements.clientEmail.value = draft.clientEmail || '';
        elements.salesAgent.value = toTitleCase(draft.salesAgent || '');
        elements.managerPhone.value = draft.managerPhone || '';

        if (!Array.isArray(draft.references) || draft.references.length === 0) {
            return;
        }

        elements.referencesContainer.innerHTML = '';
        draft.references.forEach(function(savedItem) {
            const referenceItem = createReferenceItem();
            const fields = getReferenceFields(referenceItem);

            fields.reference.value = toUpperCaseValue(savedItem.reference || '');
            fields.quantity.value = String(sanitizeQuantityValue(savedItem.quantity));
            fields.discount.value = toTitleCase(savedItem.discount || '');

            elements.referencesContainer.appendChild(referenceItem);
        });
    } catch (error) {
        console.error('Error restoring draft:', error);
    }
}

function collectItems(elements) {
    return getReferenceItems(elements)
        .reduce(function(items, item) {
            const fields = getReferenceFields(item);
            const reference = fields.reference.value.trim();
            const quantity = fields.quantity.value;
            const discount = fields.discount.value.trim();

            if (!reference) {
                return items;
            }

            items.push({
                reference: reference,
                quantity: quantity ? parseInt(quantity, 10) : '',
                discount: discount
            });

            return items;
        }, [])
        .reverse();
}

function addGeneratedCard(elements, fileName, imageUrl, labelText) {
    const card = document.createElement('article');
    card.className = 'generated-card';

    const title = document.createElement('h3');
    title.textContent = labelText;

    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = fileName;

    const actions = document.createElement('div');
    actions.className = 'generated-actions';

    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = fileName;
    downloadLink.textContent = UI_TEXT.download;

    actions.appendChild(downloadLink);
    card.appendChild(title);
    card.appendChild(image);
    card.appendChild(actions);
    elements.generatedList.appendChild(card);
}

function handleFormInput(event, elements, state) {
    const target = event.target;

    if (target === elements.clientName || target === elements.clientAddress || target === elements.salesAgent) {
        target.value = toTitleCase(target.value);
    }

    if (target.classList.contains('reference')) {
        target.value = toUpperCaseValue(target.value);
    }

    if (target.classList.contains('discount')) {
        target.value = toTitleCase(target.value);
    }

    if (target.classList.contains('quantity')) {
        target.value = String(sanitizeQuantityValue(target.value));
        updateTotalQuantity(elements);
    }

    saveDraft(elements, state);
}

function handleFocusIn(event, state) {
    const item = event.target.closest('.reference-item');
    if (!item) {
        return;
    }

    if (state.lastFocusedItem && state.lastFocusedItem !== item) {
        state.lastFocusedItem.classList.remove('focused');
    }

    state.lastFocusedItem = item;
    item.classList.add('focused');

    if (isKeyboardRelevantInput(event.target)) {
        state.keyboardAnchorInput = event.target;
    }
}

function handleFocusOut(event, state) {
    const item = event.target.closest('.reference-item');
    if (item === state.lastFocusedItem && !item.contains(document.activeElement)) {
        item.classList.remove('focused');
    }

    if (event.target === state.keyboardAnchorInput && !isKeyboardRelevantInput(document.activeElement)) {
        state.keyboardAnchorInput = null;
    }
}

function handleQuantityButtonPointerDown(event) {
    if (!event.target.closest('.quantity-btn')) {
        return;
    }

    event.preventDefault();
}

function handleReferenceContainerClick(event, elements, state) {
    const button = event.target.closest('.quantity-btn');
    if (!button) {
        return;
    }

    const quantityInput = button.parentElement.querySelector('.quantity');
    const currentValue = sanitizeQuantityValue(quantityInput.value);
    const nextValue = button.classList.contains('increment')
        ? currentValue + 1
        : Math.max(1, currentValue - 1);

    quantityInput.value = String(nextValue);
    focusQuantityInput(quantityInput, state);
    state.keyboardAnchorInput = quantityInput;
    updateTotalQuantity(elements);
    saveDraft(elements, state);
}

function handleAddReference(elements, state) {
    const referenceItem = createReferenceItem();
    elements.referencesContainer.insertBefore(referenceItem, elements.referencesContainer.firstChild);
    updateTotalQuantity(elements);
    getReferenceFields(referenceItem).reference.focus();
    saveDraft(elements, state);
}

function handleClearForm(elements, state) {
    if (!window.confirm(UI_TEXT.clearConfirm)) {
        return;
    }

    resetFormState(elements, state);
    localStorage.removeItem(STORAGE_KEY);
    showStatusMessage(elements, state, UI_TEXT.clearSuccess, 'neutral');
}

async function handleSubmit(event, elements, state) {
    event.preventDefault();

    const formData = {
        clientName: elements.clientName.value.trim(),
        clientAddress: elements.clientAddress.value.trim(),
        clientEmail: elements.clientEmail.value.trim(),
        salesAgent: elements.salesAgent.value.trim(),
        managerPhone: elements.managerPhone.value.trim(),
        orderDate: elements.orderDateInput.value,
        items: collectItems(elements)
    };

    if (formData.items.length === 0) {
        window.alert(UI_TEXT.emptyReferences);
        return;
    }

    const chunks = chunkArray(formData.items, ITEMS_PER_PAGE);
    clearGeneratedResults(elements);
    toggleGeneratedResults(elements, true);

    elements.submitBtn.disabled = true;
    elements.submitBtn.textContent = UI_TEXT.generateBusy;

    try {
        for (let index = 0; index < chunks.length; index += 1) {
            const result = await generateDocument({
                clientName: formData.clientName,
                clientAddress: formData.clientAddress,
                clientEmail: formData.clientEmail,
                salesAgent: formData.salesAgent,
                managerPhone: formData.managerPhone,
                orderDate: formData.orderDate,
                items: chunks[index],
                pageNum: index + 1,
                totalPages: chunks.length
            });

            addGeneratedCard(
                elements,
                result.fileName,
                result.imageUrl,
                formatGeneratedCardLabel(formData.clientName, index + 1, chunks.length)
            );
        }

        elements.generatedResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showStatusMessage(elements, state, UI_TEXT.generateSuccess, 'success');
    } finally {
        elements.submitBtn.disabled = false;
        elements.submitBtn.textContent = UI_TEXT.generateDefault;
    }
}

async function generateDocument(options) {
    const leftItems = options.items.slice(0, ITEMS_PER_TABLE);
    const rightItems = options.items.slice(ITEMS_PER_TABLE);
    const totalQuantity = options.items.reduce(function(sum, item) {
        return sum + (item.quantity || 0);
    }, 0);

    const clientDetailsHtml = [
        createDetailLine('Agent Commercial', options.salesAgent),
        createDetailLine('Client', options.clientName),
        createDetailLine('Adresse', options.clientAddress),
        createDetailLine('Email', options.clientEmail),
        createDetailLine('N° de tél (Responsable)', options.managerPhone),
        createDetailLine('Date', formatOrderDate(options.orderDate))
    ].join('');

    const html = `
        <div style="font-family: ${APP_FONT_STACK}; width: 210mm; min-height: 297mm; margin: auto; padding: 20px; background: white; display: flex; flex-direction: column; box-sizing: border-box;">
            <div style="flex: 1; display: flex; flex-direction: column;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 24px;">Bon de Commande</h1>
                </div>

                <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px;">
                    <div style="width: 45%;">
                        ${COMPANY_INFO_HTML}
                    </div>
                    <div style="width: 45%; padding: 10px; border: 1px solid black; border-radius: 10px; box-sizing: border-box;">
                        ${clientDetailsHtml}
                    </div>
                </div>

                <div style="display: flex; gap: 20px; margin-top: 20px; flex: 1; min-height: 0;">
                    <div style="flex: 1; min-height: 0; margin-bottom: 5px;">
                        ${buildDocumentTable(leftItems)}
                    </div>
                    <div style="flex: 1; min-height: 0; margin-bottom: 5px;">
                        ${buildDocumentTable(rightItems)}
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; font-weight: 700;">
                <p style="margin: 0;">Quantité : ${totalQuantity}</p>
                <p style="margin: 0;">${options.pageNum}/${options.totalPages}</p>
            </div>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: '#ffffff'
        });
        const imageUrl = canvas.toDataURL('image/png');
        const baseName = sanitizeDocumentFilename(options.clientName, options.orderDate);
        const fileName = options.totalPages === 1
            ? `${baseName}.png`
            : `${baseName}_${options.pageNum}.png`;

        return { fileName: fileName, imageUrl: imageUrl };
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    } finally {
        document.body.removeChild(container);
    }
}

function createDetailLine(label, value) {
    return `<p style="margin: 5px 0;"><strong>${label} :</strong> ${escapeHtml(value)}</p>`;
}

function buildDocumentTable(items) {
    const headerStyle = 'border: 1px solid black; padding: 4px; background: #e6e9ef; color: #111111;';
    const rows = [
        `
            <tr style="border: 1px solid black; height: 38px;">
                <th style="${headerStyle}">Référence</th>
                <th style="${headerStyle}">Quantité</th>
                <th style="${headerStyle}">Remise</th>
            </tr>
        `
    ];

    for (let index = 0; index < ITEMS_PER_TABLE; index += 1) {
        const item = items[index];
        rows.push(`
            <tr style="border: 1px solid black; height: 38px;">
                <td style="border: 1px solid black; padding: 4px; font-weight: 700; text-align: center; vertical-align: middle;">${item ? escapeHtml(item.reference) : ''}</td>
                <td style="border: 1px solid black; padding: 4px; text-align: center;">${item ? formatQuantityCell(item.quantity) : ''}</td>
                <td style="border: 1px solid black; padding: 4px; font-weight: 700; text-align: center; vertical-align: middle;">${item ? formatDiscountCell(item.discount) : ''}</td>
            </tr>
        `);
    }

    return `<table style="width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed;">${rows.join('')}</table>`;
}

function formatQuantityCell(quantity) {
    if (!quantity || quantity <= 1) {
        return '';
    }

    return `<span style="font-weight: 700;">x ${quantity}</span>`;
}

function formatDiscountCell(discount) {
    if (!discount) {
        return '';
    }

    return `<span style="font-weight: 700;">${escapeHtml(discount)}</span>`;
}

function formatGeneratedCardLabel(clientName, pageNum, totalPages) {
    const safeClientName = clientName || 'Bon de commande';
    return `${safeClientName} - ${pageNum}/${totalPages}`;
}

function chunkArray(items, chunkSize) {
    const chunks = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
}

function toTitleCase(value) {
    return value
        .toLowerCase()
        .replace(/\b\p{L}/gu, function(letter) {
            return letter.toUpperCase();
        });
}

function toUpperCaseValue(value) {
    return value.toLocaleUpperCase('fr-FR');
}

function sanitizeQuantityValue(value) {
    const parsedValue = parseInt(value, 10);
    return Number.isNaN(parsedValue) || parsedValue < 1 ? 1 : parsedValue;
}

function isKeyboardRelevantInput(element) {
    return Boolean(
        element &&
        element.matches &&
        element.matches('.reference, .quantity, .discount')
    );
}

function bindViewportTracking(state) {
    const syncVirtualKeyboardState = function() {
        state.isVirtualKeyboardVisible = detectVirtualKeyboardVisibility();
    };

    syncVirtualKeyboardState();

    if (!window.visualViewport) {
        return;
    }

    window.visualViewport.addEventListener('resize', syncVirtualKeyboardState);
    window.visualViewport.addEventListener('scroll', syncVirtualKeyboardState);
}

function detectVirtualKeyboardVisibility() {
    if (!window.visualViewport) {
        return isKeyboardRelevantInput(document.activeElement);
    }

    const viewportHeightDelta = window.innerHeight - window.visualViewport.height;
    return viewportHeightDelta > 120;
}

function focusQuantityInput(quantityInput, state) {
    if (state.isVirtualKeyboardVisible) {
        quantityInput.focus({ preventScroll: true });
        quantityInput.select();
        return;
    }

    const wasReadOnly = quantityInput.readOnly;
    quantityInput.readOnly = true;
    quantityInput.focus({ preventScroll: true });

    window.setTimeout(function() {
        quantityInput.readOnly = wasReadOnly;
    }, 0);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeDocumentFilename(clientName, orderDate) {
    const normalizedName = clientName && clientName.trim() ? clientName : 'bon_de_commande';
    const normalizedDate = orderDate && orderDate.trim() ? orderDate.trim() : TODAY;
    const cleanedName = normalizedName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .trim()
        .replace(/\s+/g, '_');

    const cleanedDate = normalizedDate.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    const safeName = cleanedName || 'bon_de_commande';

    return cleanedDate ? `${safeName}_${cleanedDate}` : safeName;
}

function formatOrderDate(orderDate) {
    const [year, month, day] = orderDate.split('-');
    return `${day}/${month}/${year}`;
}
