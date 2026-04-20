const STORAGE_KEY = 'otc-order-form-draft';
const ITEMS_PER_PAGE = 42;
const ITEMS_PER_TABLE = 21;
const TODAY = new Date().toISOString().split('T')[0];
const COMPANY_INFO_HTML = `
    <p style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.14em; line-height: 1;">O.T.C</p>
    <p style="margin: 2px 0 0; font-size: 19px; font-weight: 800;">Optical Trade Company</p>
    <p style="margin: 8px 0 0; font-size: 13px; line-height: 1.55;">
        4 Av. Taieb Mhiri App. N°2 - 2080 ARIANA<br>
        Tél : 00 216 29 808 579 / SAV : 29 760 935<br>
        E-mail : opticaltrade.company@gmail.com
    </p>
`;

document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        addReferenceBtn: document.getElementById('addReference'),
        clearFormBtn: document.getElementById('clearForm'),
        clientAddress: document.getElementById('clientAddress'),
        clientEmail: document.getElementById('clientEmail'),
        clientName: document.getElementById('clientName'),
        generatedList: document.getElementById('generatedList'),
        generatedResults: document.getElementById('generatedResults'),
        orderDateInput: document.getElementById('orderDate'),
        orderForm: document.getElementById('orderForm'),
        referencesContainer: document.getElementById('referencesContainer'),
        submitBtn: document.getElementById('generateOrder'),
        totalQuantity: document.getElementById('totalQuantity')
    };

    let lastFocusedItem = null;

    function setDefaultDate() {
        elements.orderDateInput.value = TODAY;
    }

    function createReferenceItem() {
        const referenceItem = document.createElement('div');
        referenceItem.className = 'reference-item';
        referenceItem.innerHTML = `
            <input type="text" class="reference" placeholder="Référence de monture">
            <input type="number" class="quantity" placeholder="Quantité" min="1" value="1">
            <input type="text" class="discount" placeholder="Remise">
        `;
        return referenceItem;
    }

    function getReferenceItems() {
        return Array.from(elements.referencesContainer.querySelectorAll('.reference-item'));
    }

    function updateTotalQuantity() {
        const total = getReferenceItems().reduce(function(sum, item) {
            const value = parseInt(item.querySelector('.quantity').value, 10);
            return sum + (Number.isNaN(value) ? 0 : value);
        }, 0);

        elements.totalQuantity.textContent = String(total);
    }

    function toggleGeneratedResults(visible) {
        elements.generatedResults.hidden = !visible;
    }

    function clearGeneratedResults() {
        elements.generatedList.innerHTML = '';
        toggleGeneratedResults(false);
    }

    function resetFormState() {
        elements.orderForm.reset();
        setDefaultDate();
        elements.referencesContainer.innerHTML = '';
        elements.referencesContainer.appendChild(createReferenceItem());
        clearGeneratedResults();
        lastFocusedItem = null;
        updateTotalQuantity();
    }

    function serializeReferences() {
        return getReferenceItems().map(function(item) {
            return {
                reference: item.querySelector('.reference').value,
                quantity: item.querySelector('.quantity').value,
                discount: item.querySelector('.discount').value
            };
        });
    }

    function saveDraft() {
        const draft = {
            orderDate: elements.orderDateInput.value,
            clientName: elements.clientName.value,
            clientAddress: elements.clientAddress.value,
            clientEmail: elements.clientEmail.value,
            references: serializeReferences()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }

    function restoreDraft() {
        const savedDraft = localStorage.getItem(STORAGE_KEY);
        if (!savedDraft) {
            return;
        }

        try {
            const draft = JSON.parse(savedDraft);
            elements.orderDateInput.value = draft.orderDate || TODAY;
            elements.clientName.value = draft.clientName || '';
            elements.clientAddress.value = draft.clientAddress || '';
            elements.clientEmail.value = draft.clientEmail || '';

            if (Array.isArray(draft.references) && draft.references.length > 0) {
                elements.referencesContainer.innerHTML = '';

                draft.references.forEach(function(savedItem) {
                    const referenceItem = createReferenceItem();
                    referenceItem.querySelector('.reference').value = toTitleCase(savedItem.reference || '');
                    referenceItem.querySelector('.quantity').value = savedItem.quantity || '1';
                    referenceItem.querySelector('.discount').value = toTitleCase(savedItem.discount || '');
                    elements.referencesContainer.appendChild(referenceItem);
                });
            }
        } catch (error) {
            console.error('Error restoring draft:', error);
        }
    }

    function collectItems() {
        return getReferenceItems()
            .reduce(function(items, item) {
                const reference = item.querySelector('.reference').value.trim();
                const quantity = item.querySelector('.quantity').value;
                const discount = item.querySelector('.discount').value.trim();

                if (reference) {
                    items.push({
                        reference: reference,
                        quantity: quantity ? parseInt(quantity, 10) : '',
                        discount: discount
                    });
                }

                return items;
            }, [])
            .reverse();
    }

    function addGeneratedCard(fileName, imageUrl, labelText) {
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
        downloadLink.textContent = 'Télécharger';

        actions.appendChild(downloadLink);
        card.appendChild(title);
        card.appendChild(image);
        card.appendChild(actions);
        elements.generatedList.appendChild(card);
    }

    function handleFormInput(event) {
        if (event.target === elements.clientName || event.target === elements.clientAddress) {
            event.target.value = toTitleCase(event.target.value);
        }

        if (event.target.classList.contains('reference') || event.target.classList.contains('discount')) {
            event.target.value = toTitleCase(event.target.value);
        }

        if (event.target.classList.contains('quantity')) {
            updateTotalQuantity();
        }

        saveDraft();
    }

    function handleFocusIn(event) {
        const item = event.target.closest('.reference-item');
        if (!item) {
            return;
        }

        if (lastFocusedItem && lastFocusedItem !== item) {
            lastFocusedItem.classList.remove('focused');
        }

        lastFocusedItem = item;
        item.classList.add('focused');
    }

    function handleFocusOut(event) {
        const item = event.target.closest('.reference-item');
        if (!item || item !== lastFocusedItem) {
            return;
        }

        if (!item.contains(document.activeElement)) {
            item.classList.remove('focused');
        }
    }

    function handleAddReference() {
        const referenceItem = createReferenceItem();
        elements.referencesContainer.insertBefore(referenceItem, elements.referencesContainer.firstChild);
        updateTotalQuantity();
        referenceItem.querySelector('.reference').focus();
        saveDraft();
    }

    function handleClearForm() {
        const confirmClear = window.confirm('Vider le formulaire et supprimer le brouillon enregistré ?');
        if (!confirmClear) {
            return;
        }

        resetFormState();
        localStorage.removeItem(STORAGE_KEY);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const formData = {
            clientName: elements.clientName.value.trim(),
            clientAddress: elements.clientAddress.value.trim(),
            clientEmail: elements.clientEmail.value.trim(),
            orderDate: elements.orderDateInput.value,
            items: collectItems()
        };

        if (formData.items.length === 0) {
            window.alert('Ajoutez au moins une référence avant de générer le bon de commande.');
            return;
        }

        const chunks = chunkArray(formData.items, ITEMS_PER_PAGE);
        clearGeneratedResults();
        toggleGeneratedResults(true);

        elements.submitBtn.disabled = true;
        elements.submitBtn.textContent = 'Génération en cours...';

        try {
            for (let index = 0; index < chunks.length; index += 1) {
                const result = await generateDocument({
                    clientName: formData.clientName,
                    clientAddress: formData.clientAddress,
                    clientEmail: formData.clientEmail,
                    orderDate: formData.orderDate,
                    items: chunks[index],
                    pageNum: index + 1,
                    totalPages: chunks.length
                });

                addGeneratedCard(
                    result.fileName,
                    result.imageUrl,
                    formatGeneratedCardLabel(formData.clientName, index + 1, chunks.length)
                );
            }

            elements.generatedResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } finally {
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = 'Générer bon de commande';
        }
    }

    setDefaultDate();
    restoreDraft();
    updateTotalQuantity();

    elements.referencesContainer.addEventListener('focusin', handleFocusIn);
    elements.referencesContainer.addEventListener('focusout', handleFocusOut);
    elements.orderForm.addEventListener('input', handleFormInput);
    elements.addReferenceBtn.addEventListener('click', handleAddReference);
    elements.clearFormBtn.addEventListener('click', handleClearForm);
    elements.orderForm.addEventListener('submit', handleSubmit);
});

async function generateDocument(options) {
    const leftItems = options.items.slice(0, ITEMS_PER_TABLE);
    const rightItems = options.items.slice(ITEMS_PER_TABLE);
    const totalQuantity = options.items.reduce(function(sum, item) {
        return sum + (item.quantity ? item.quantity : 0);
    }, 0);
    const addressLine = options.clientAddress
        ? `<p style="margin: 5px 0;"><strong>Adresse :</strong> ${escapeHtml(options.clientAddress)}</p>`
        : '';

    const html = `
        <div style="font-family: Arial, sans-serif; width: 210mm; height: 297mm; margin: auto; padding: 20px; background: white; display: flex; flex-direction: column;">
            <div style="flex: 1; display: flex; flex-direction: column;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 24px;">Bon de Commande</h1>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div style="width: 45%;">
                        ${COMPANY_INFO_HTML}
                    </div>
                    <div style="width: 45%; padding: 10px; border: 1px solid black; border-radius: 10px;">
                        <h3 style="margin: 0 0 10px;">Informations Client :</h3>
                        <p style="margin: 5px 0;"><strong>Nom :</strong> ${escapeHtml(options.clientName)}</p>
                        ${addressLine}
                        <p style="margin: 5px 0;"><strong>Email :</strong> ${escapeHtml(options.clientEmail)}</p>
                        <p style="margin: 5px 0;"><strong>Date :</strong> ${formatOrderDate(options.orderDate)}</p>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; margin-top: 20px; height: 75vh; min-height: 0;">
                    <div style="flex: 1; min-height: 0; margin-bottom: 5px;">
                        ${buildDocumentTable(leftItems)}
                    </div>
                    <div style="flex: 1; min-height: 0; margin-bottom: 5px;">
                        ${buildDocumentTable(rightItems)}
                    </div>
                </div>
            </div>

            <p style="margin-top: 5px; margin-bottom: 1px; font-weight: bold; align-self: flex-start;">Quantité : ${totalQuantity}</p>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
        const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
        const baseName = sanitizeDocumentFilename(options.clientName);
        const fileName = options.totalPages === 1
            ? `${baseName}.jpeg`
            : `${baseName}_${options.pageNum}.jpeg`;

        return { fileName: fileName, imageUrl: imageUrl };
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    } finally {
        document.body.removeChild(container);
    }
}

function buildDocumentTable(items) {
    let rows = `
        <tr style="border: 1px solid black; height: 38px;">
            <th style="border: 1px solid black; padding: 4px;">Référence</th>
            <th style="border: 1px solid black; padding: 4px;">Quantité</th>
            <th style="border: 1px solid black; padding: 4px;">Remise</th>
        </tr>
    `;

    for (let index = 0; index < ITEMS_PER_TABLE; index += 1) {
        const item = items[index];
        rows += `
            <tr style="border: 1px solid black; height: 38px;">
                <td style="border: 1px solid black; padding: 4px; font-weight: 700;">${item ? escapeHtml(item.reference) : ''}</td>
                <td style="border: 1px solid black; padding: 4px; text-align: center;">${item ? formatQuantityCell(item.quantity) : ''}</td>
                <td style="border: 1px solid black; padding: 4px; font-weight: 700;">${item ? formatDiscountCell(item.discount) : ''}</td>
            </tr>
        `;
    }

    return `<table style="width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed;">${rows}</table>`;
}

function formatQuantityCell(quantity) {
    if (!quantity) {
        return '';
    }

    const color = quantity > 1 ? '#c62828' : '#111111';
    return `<span style="font-weight: 700; color: ${color};">x ${quantity}</span>`;
}

function formatDiscountCell(discount) {
    if (!discount) {
        return '';
    }

    return `<span style="font-weight: 700; color: #c62828;">${escapeHtml(discount)}</span>`;
}

function formatGeneratedCardLabel(clientName, pageNum, totalPages) {
    const safeClientName = clientName || 'Bon de commande';
    const pageLabel = totalPages === 1 ? 'Page 1' : `Page ${pageNum}`;
    return `${safeClientName} - ${pageLabel}`;
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

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeDocumentFilename(clientName) {
    const normalizedName = clientName && clientName.trim() ? clientName : 'bon_de_commande';
    const cleanedName = normalizedName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .trim()
        .replace(/\s+/g, '_');

    return cleanedName || 'bon_de_commande';
}

function formatOrderDate(orderDate) {
    const dateParts = orderDate.split('-');
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
}
