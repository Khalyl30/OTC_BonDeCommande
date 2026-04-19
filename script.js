document.addEventListener('DOMContentLoaded', function() {
    const addReferenceBtn = document.getElementById('addReference');
    const referencesContainer = document.getElementById('referencesContainer');
    const orderForm = document.getElementById('orderForm');
    let lastFocusedItem = null;

    // Update total quantity
    function updateTotalQuantity() {
        const quantityInputs = document.querySelectorAll('.quantity');
        let total = 0;
        quantityInputs.forEach(input => {
            const value = parseInt(input.value, 10);
            if (!isNaN(value)) {
                total += value;
            }
        });
        document.getElementById('totalQuantity').textContent = total;
    }

    updateTotalQuantity();

    const removeReferenceBtn = document.getElementById('removeReference');

    referencesContainer.addEventListener('focusin', function(e) {
        const item = e.target.closest('.reference-item');
        if (item) {
            if (lastFocusedItem && lastFocusedItem !== item) {
                lastFocusedItem.classList.remove('focused');
            }
            lastFocusedItem = item;
            item.classList.add('focused');
        }
    });

    referencesContainer.addEventListener('focusout', function(e) {
        const item = e.target.closest('.reference-item');
        if (item && item === lastFocusedItem) {
            const hasFocusedChild = item.contains(document.activeElement);
            if (!hasFocusedChild) {
                item.classList.remove('focused');
            }
        }
    });

    // Add new reference input
    addReferenceBtn.addEventListener('click', function() {
        const referenceItem = document.createElement('div');
        referenceItem.className = 'reference-item';
        referenceItem.innerHTML = `
            <input type="text" class="reference" placeholder="Référence de monture" oninput="this.value = this.value.toUpperCase()">
            <input type="number" class="quantity" placeholder="Quantité" min="1" value="1">
            <input type="number" class="discount" placeholder="Remise" min="0" step="0.01">
        `;

        if (lastFocusedItem && referencesContainer.contains(lastFocusedItem)) {
            lastFocusedItem.insertAdjacentElement('beforebegin', referenceItem);
        } else {
            referencesContainer.insertBefore(referenceItem, referencesContainer.firstChild);
        }

        updateTotalQuantity();
    });

    // Remove the focused reference input or clear the first one if only one remains
    removeReferenceBtn.addEventListener('click', function() {
        const referenceItems = referencesContainer.querySelectorAll('.reference-item');
        if (referenceItems.length > 1) {
            if (lastFocusedItem && referencesContainer.contains(lastFocusedItem)) {
                lastFocusedItem.remove();
            } else {
                referenceItems[referenceItems.length - 1].remove();
            }
            lastFocusedItem = null;
        } else if (referenceItems.length === 1) {
            const firstItem = referenceItems[0];
            firstItem.querySelectorAll('input').forEach(input => {
                if (input.classList.contains('quantity')) {
                    input.value = '1';
                } else {
                    input.value = '';
                }
            });
        }
        updateTotalQuantity();
    });

    // Update total on quantity change
    referencesContainer.addEventListener('input', function(e) {
        if (e.target.classList.contains('quantity')) {
            updateTotalQuantity();
        }
    });

    // Generate image on form submit
    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const confirmGenerate = window.confirm('Générer le bon de commande ou continuer à éditer ? Appuyez sur OK pour générer, Annuler pour continuer.');
        if (!confirmGenerate) {
            return;
        }

        const clientName = document.getElementById('clientName').value;
        const clientAddress = document.getElementById('clientAddress').value;
        const clientEmail = document.getElementById('clientEmail').value;
        const orderDate = document.getElementById('orderDate').value;
        
        const items = [];
        const referenceItems = document.querySelectorAll('.reference-item');
        referenceItems.forEach(item => {
            const reference = item.querySelector('.reference').value;
            const quantity = item.querySelector('.quantity').value;
            const discount = item.querySelector('.discount').value;
            if (reference.trim()) {
                items.push({ 
                    reference, 
                    quantity: quantity ? parseInt(quantity) : '', 
                    discount: discount ? parseFloat(discount) : '' 
                });
            }
        });

        const chunkSize = 42;
        const chunks = [];
        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }
        chunks.forEach((chunk, index) => {
            setTimeout(() => {
                generateDocument(clientName, clientAddress, clientEmail, orderDate, chunk, index + 1);
            }, index * 1000); // Delay each document generation by 1 second
        });
    });
});

function generateDocument(clientName, clientAddress, clientEmail, orderDate, items, pageNum) {
    // Create HTML content for the document
    const maxPerTable = 21;
    const leftItems = items.slice(0, maxPerTable);
    const rightItems = items.slice(maxPerTable);

    const dateParts = orderDate.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ? item.quantity : 0), 0);

    let tableLeftHTML = '<table style="width: 100%; border-collapse: collapse; margin-right: 10px; height: 100%; table-layout: fixed;"><tr style="border: 1px solid black; height: 38px;"><th style="border: 1px solid black; padding: 4px;">Référence</th><th style="border: 1px solid black; padding: 4px;">Quantité</th><th style="border: 1px solid black; padding: 4px;">Remise</th></tr>';
    function formatQuantity(quantity) {
        return quantity ? `x ${quantity}` : '';
    }

    for (let i = 0; i < 21; i++) {
        const item = leftItems[i];
        tableLeftHTML += '<tr style="border: 1px solid black; height: 38px;"><td style="border: 1px solid black; padding: 4px;">' + (item ? item.reference : '') + '</td><td style="border: 1px solid black; padding: 4px;">' + (item && item.quantity ? formatQuantity(item.quantity) : '') + '</td><td style="border: 1px solid black; padding: 4px;">' + (item && item.discount ? item.discount.toFixed(2) : '') + '</td></tr>';
    }
    tableLeftHTML += '</table>';

    let tableRightHTML = '<table style="width: 100%; border-collapse: collapse; height: 100%; table-layout: fixed;"><tr style="border: 1px solid black; height: 38px;"><th style="border: 1px solid black; padding: 4px;">Référence</th><th style="border: 1px solid black; padding: 4px;">Quantité</th><th style="border: 1px solid black; padding: 4px;">Remise</th></tr>';
    for (let i = 0; i < 21; i++) {
        const item = rightItems[i];
        tableRightHTML += '<tr style="border: 1px solid black; height: 38px;"><td style="border: 1px solid black; padding: 4px;">' + (item ? item.reference : '') + '</td><td style="border: 1px solid black; padding: 4px;">' + (item && item.quantity ? formatQuantity(item.quantity) : '') + '</td><td style="border: 1px solid black; padding: 4px;">' + (item && item.discount ? item.discount.toFixed(2) : '') + '</td></tr>';
    }
    tableRightHTML += '</table>';

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: white; width: 210mm; height: 297mm; margin: auto; display: flex; flex-direction: column;">
            <div style="flex: 1; display: flex; flex-direction: column;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 24px;">Bon de Commande</h1>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div style="width: 45%;">
                        <p><strong>O.T.C</strong></p>
                        <p><strong>Optical Trade Company</strong></p>
                        <p style="font-size: 12px;">4 Av.Taieb Mhiri App.N°2 - 2080 ARIANA<br>
                        Tél: 0021629 808 579 / SAV : 29 760 935<br>
                        E-mail: opticaltrade.company@gmail.com</p>
                    </div>
                    <div style="width: 45%; border: 1px solid black; border-radius: 10px; padding: 10px;">
                        <h3 style="margin: 0 0 10px 0;">Informations Client:</h3>
                        <p style="margin: 5px 0;"><strong>Nom:</strong> ${clientName}</p>
                        <p style="margin: 5px 0;"><strong>Adresse:</strong> ${clientAddress}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${clientEmail}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                    </div>
                </div>
                
                <div style="display: flex; gap: 20px; margin-top: 20px; height: 75vh; min-height: 0;">
                    <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; margin-bottom: 5px;">
                        ${tableLeftHTML}
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; margin-bottom: 5px;">
                        ${tableRightHTML}
                    </div>
                </div>
            </div>
            
            <p style="margin-top: 5px; margin-bottom: 1px; font-weight: bold; align-self: flex-start;">Quantité : ${totalQuantity}</p>
        </div>
    `;

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // Use html2canvas to capture the container as an image
    html2canvas(container, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
        // Convert canvas to JPEG
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.download = `bon_de_commande_${pageNum}.jpeg`;
        link.click();

        // Clean up
        document.body.removeChild(container);
    }).catch(error => {
        console.error('Error generating image:', error);
        document.body.removeChild(container);
    });
}