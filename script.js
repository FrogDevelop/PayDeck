// Улучшенная система данных с версионированием
const DATA_VERSION = '1.2';

let data = loadData();

// Загрузка данных из localStorage с проверкой версии
function loadData() {
    try {
        const savedData = localStorage.getItem('waiterData');
        if (!savedData) {
            return initializeDefaultData();
        }
        
        const parsedData = JSON.parse(savedData);
        
        // Проверка версии данных и миграция при необходимости
        if (!parsedData.version || parsedData.version !== DATA_VERSION) {
            return migrateData(parsedData);
        }
        if (!parsedData.payouts) parsedData.payouts = [];
        return parsedData;
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
        return initializeDefaultData();
    }
}

// Инициализация данных по умолчанию
function initializeDefaultData() {
    return {
        version: DATA_VERSION,
        profile: {
            firstName: '',
            lastName: '',
            restaurant: '',
            avatar: ''
        },
        totalEarnings: 0,
        goals: [],
        records: [],
        payouts: []
    };
}

// Миграция данных при изменении структуры
function migrateData(oldData) {
    const newData = initializeDefaultData();
    
    // Миграция профиля
    if (oldData.profile) {
        newData.profile = {...newData.profile, ...oldData.profile};
    }
    
    // Миграция записей с проверкой структуры
    if (oldData.records && Array.isArray(oldData.records)) {
        newData.records = oldData.records.map(record => ({
            id: record.id || Date.now() + Math.random(),
            date: record.date || new Date().toLocaleDateString('ru-RU'),
            timestamp: record.timestamp || new Date().toISOString(),
            shiftSalary: parseFloat(record.shiftSalary) || 0,
            sales: parseFloat(record.sales) || 0,
            percentage: parseFloat(record.percentage) || 0,
            earnings: parseFloat(record.earnings) || 0,
            tips: parseFloat(record.tips) || 0,
            total: parseFloat(record.total) || 0
        }));
    }
    
    // Миграция целей
    if (oldData.goal && oldData.goal.name) {
        newData.goals = [{
            id: Date.now() + Math.random(),
            name: oldData.goal.name,
            amount: parseFloat(oldData.goal.amount) || 0,
            createdAt: new Date().toISOString()
        }];
    } else if (oldData.goals) {
        newData.goals = [...oldData.goals];
    }
    
    if (oldData.payouts && Array.isArray(oldData.payouts)) {
    newData.payouts = [...oldData.payouts];
    }

    // Пересчет общего заработка
    newData.totalEarnings = newData.records.reduce((sum, record) => sum + (parseFloat(record.total) || 0), 0);
    
    saveData(newData);
    showNotification('Данные обновлены до новой версии', 'success');
    
    return newData;
}


// Создание элемента цели (перемещено в начало)
// ПРОСТАЯ ВЕРСИЯ создания элемента цели без зависимостей
function createGoalElement(goal) {
    const goalElement = document.createElement('div');
    goalElement.className = 'goal-card';
    
    // Берем актуальный totalEarnings из объекта data
    const totalEarnings = data.records.reduce((sum, r) => sum + (parseFloat(r.shiftSalary) + parseFloat(r.earnings)), 0);
    const percentage = Math.min((totalEarnings / goal.amount) * 100, 100);
    
    goalElement.innerHTML = `
        <div class="goal-name">${goal.name}</div>
        <div class="goal-amount">${goal.amount.toFixed(2)} ₽</div>
        <div class="goal-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="progress-percentage">${percentage.toFixed(1)}%</div>
        </div>
    `;
    
    return goalElement;
}


// Инициализация при загрузке страницы
window.onload = function() {
    initializeApp();
    setupEventListeners();
};

// Инициализация приложения
function initializeApp() {
    updateDateDisplay();
    updateMainScreen();
    updateGoalsDisplay();
    
    // Добавляем обработчики для предпросмотра расчетов
    document.getElementById('shiftSalary').addEventListener('input', updateCalculationPreview);
    document.getElementById('sales').addEventListener('input', updateCalculationPreview);
    document.getElementById('percentage').addEventListener('input', updateCalculationPreview);
    document.getElementById('tips').addEventListener('input', updateCalculationPreview);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });
}

// Обновление отображения даты
function updateDateDisplay() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
}

// Обновление главного экрана
function updateMainScreen() {
    updateTodayCard();
    updateYesterdayCard();
    updateBestShiftCard();
    updateGoalsDisplay();
}

// Обновление карты сегодняшнего дня
function updateTodayCard() {
    const today = new Date().toLocaleDateString('ru-RU');
    const todayRecords = data.records.filter(record => record.date === today);
    const todayTotal = todayRecords.reduce((sum, record) => sum + (parseFloat(record.total) || 0), 0);
    
    const todayEarningsElement = document.getElementById('todayEarnings');
    const todayCardContent = document.querySelector('.today-card .card-content p');
    
    todayEarningsElement.textContent = todayTotal.toFixed(2) + ' ₽';
    
    if (todayRecords.length === 0) {
        todayCardContent.textContent = 'Еще нет данных за сегодня';
    } else {
        const shiftsCount = todayRecords.length;
        todayCardContent.textContent = `${shiftsCount} смен${shiftsCount === 1 ? 'а' : 'ы'}`;
    }
}

// Обновление карты вчерашнего дня
function updateYesterdayCard() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFormatted = yesterday.toLocaleDateString('ru-RU');
    
    const yesterdayRecords = data.records.filter(record => record.date === yesterdayFormatted);
    const yesterdayTotal = yesterdayRecords.reduce((sum, record) => sum + (parseFloat(record.total) || 0), 0);
    
    const yesterdayEarningsElement = document.getElementById('yesterdayEarnings');
    const yesterdayDetailsElement = document.getElementById('yesterdayDetails');
    
    yesterdayEarningsElement.textContent = yesterdayTotal.toFixed(2) + ' ₽';
    
    if (yesterdayRecords.length === 0) {
        yesterdayDetailsElement.textContent = 'Нет данных';
    } else {
        const shiftsCount = yesterdayRecords.length;
        const avgPerShift = yesterdayTotal / shiftsCount;
        yesterdayDetailsElement.textContent = `${shiftsCount} смен${shiftsCount === 1 ? 'а' : 'ы'}, в среднем ${avgPerShift.toFixed(2)} ₽`;
    }
}

// Обновление карты лучшей смены
function updateBestShiftCard() {
    if (data.records.length === 0) {
        document.getElementById('bestShiftAmount').textContent = '0 ₽';
        document.getElementById('bestShiftDate').textContent = 'Нет данных';
        document.getElementById('bestShiftProgress').style.width = '0%';
        document.getElementById('bestShiftPercentage').textContent = '0%';
        return;
    }
    
    const bestShift = data.records.reduce((best, record) => {
        const recordTotal = parseFloat(record.total) || 0;
        const bestTotal = parseFloat(best.total) || 0;
        return recordTotal > bestTotal ? record : best;
    });
    
    const bestTotal = parseFloat(bestShift.total) || 0;
    const bestGoal = data.goals[0]; // Берем первую цель для прогресса
    
    document.getElementById('bestShiftAmount').textContent = bestTotal.toFixed(2) + ' ₽';
    document.getElementById('bestShiftDate').textContent = bestShift.date;
    
    if (bestGoal) {
        const percentage = Math.min((bestTotal / bestGoal.amount) * 100, 100);
        document.getElementById('bestShiftProgress').style.width = percentage + '%';
        document.getElementById('bestShiftPercentage').textContent = percentage.toFixed(1) + '%';
    } else {
        document.getElementById('bestShiftProgress').style.width = '0%';
        document.getElementById('bestShiftPercentage').textContent = '0%';
    }
}

// Обновление отображения целей
function updateGoalsDisplay() {
    updateMainGoalsGrid();
    updateModalGoalsGrid();
}



// Обновление сетки целей на главном экране
function updateMainGoalsGrid() {
    const goalsGrid = document.getElementById('goalsGrid');
    goalsGrid.innerHTML = '';
    
    // Показываем только первые 4 цели на главном экране
    const displayGoals = data.goals.slice(0, 4);
    
    displayGoals.forEach(goal => {
        const goalElement = createGoalElement(goal);
        goalsGrid.appendChild(goalElement);
    });
    
    // Добавляем кнопку создания цели, если есть место
    if (data.goals.length < 4) {
        const createGoalCard = document.createElement('div');
        createGoalCard.className = 'goal-card create-goal';
        createGoalCard.onclick = () => openModal('createGoalModal');
        createGoalCard.innerHTML = `
            <div class="create-goal-icon">+</div>
            <div class="create-goal-text">Создать цель</div>
        `;
        goalsGrid.appendChild(createGoalCard); // ✅ теперь правильно
    }
}

// Обновление сетки целей в модальном окне
function updateModalGoalsGrid() {
    const goalsGridModal = document.getElementById('goalsGridModal');
    goalsGridModal.innerHTML = '';
    
    data.goals.forEach(goal => {
        const goalElement = createGoalElement(goal);
        goalsGridModal.appendChild(goalElement);
    });
    
    // Всегда добавляем кнопку создания цели в модалке
    const createGoalCard = document.createElement('div');
    createGoalCard.className = 'goal-card create-goal';
    createGoalCard.onclick = () => openModal('createGoalModal');
    createGoalCard.innerHTML = `
        <div class="create-goal-icon">+</div>
        <div class="create-goal-text">Создать цель</div>
    `;
    goalsGridModal.appendChild(createGoalCard);
}

// Функции работы с модальными окнами
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        // Обновляем данные в модалке при открытии
        if (modalId === 'statsModal') {
            updateStatsTable();
        } else if (modalId === 'goalsModal') {
            updateModalGoalsGrid();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Обновление предпросмотра расчетов
function updateCalculationPreview() {
    const shiftSalary = parseFloat(document.getElementById('shiftSalary').value) || 0;
    const sales = parseFloat(document.getElementById('sales').value) || 0;
    const percentage = parseFloat(document.getElementById('percentage').value) || 0;
    const tips = parseFloat(document.getElementById('tips').value) || 0;
    
    const earnings = (sales * percentage) / 100;
    const total = shiftSalary + earnings + tips;
    
    // Обновляем предпросмотр
    document.getElementById('previewShiftSalary').textContent = shiftSalary.toFixed(2) + ' ₽';
    document.getElementById('previewEarnings').textContent = earnings.toFixed(2) + ' ₽';
    document.getElementById('previewTips').textContent = tips.toFixed(2) + ' ₽';
    document.getElementById('previewTotal').textContent = total.toFixed(2) + ' ₽';
}

// Сохранение данных
function saveData(dataToSave = data) {
    try {
        localStorage.setItem('waiterData', JSON.stringify(dataToSave));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        showNotification('Ошибка сохранения данных', 'error');
        return false;
    }
}

// Расчет дохода
function calculate() {
    const shiftSalary = parseFloat(document.getElementById('shiftSalary').value) || 0;
    const earnings = parseFloat(document.getElementById('sales').value) || 0;
    const percentage = parseFloat(document.getElementById('percentage').value) || 0;
    const tips = parseFloat(document.getElementById('tips').value) || 0;

    const earningsFromSales = earnings * (percentage / 100);
    const total = shiftSalary + earningsFromSales + tips;

    // Сохраняем расчёт в records
    if (!data.records) data.records = [];
    data.records.push({
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU'),
        timestamp: Date.now(),
        shiftSalary,
        earnings: earningsFromSales,
        tips,
        total
    });

    saveData(); // Сохраняем в localStorage или в объект data

    // Обновляем все экраны
    updateMainScreen();      // Обновляем карточки Сегодня, Вчера, Лучшая смена
    updateStatsTable();      // Обновляем таблицу статистики
    updatePayoutsCard();     // Обновляем карточку выплат
    updateGoalsDisplay();    // ✅ Обновляем прогресс целей

    // Сброс формы
    document.getElementById('shiftSalary').value = '';
    document.getElementById('sales').value = '';
    document.getElementById('percentage').value = '';
    document.getElementById('tips').value = '';

    showNotification('Расчет сохранён', 'success');
}

// Сохранение цели - ИСПРАВЛЕННАЯ ВЕРСИЯ
function saveGoal() {
    const goalName = document.getElementById('goalName').value.trim();
    const goalAmount = parseFloat(document.getElementById('goalAmount').value) || 0;
    
    if (!goalName) {
        showNotification('Введите название цели', 'error');
        return;
    }
    
    if (goalAmount <= 0) {
        showNotification('Сумма цели должна быть больше 0', 'error');
        return;
    }
    
    const goal = {
        id: Date.now() + Math.random(),
        name: goalName,
        amount: goalAmount,
        createdAt: new Date().toISOString()
    };
    
    data.goals.push(goal);
    
    if (saveData()) {
        updateGoalsDisplay();
        updateMainScreen();
        
        // Закрываем модалку создания цели
        closeModal('createGoalModal');
        
        // Очистка полей
        document.getElementById('goalName').value = '';
        document.getElementById('goalAmount').value = '';
        
        showNotification('Цель создана', 'success');
    }
}

// Обновление таблицы статистики
function updateStatsTable() {
    const table = document.getElementById('statsTable');
    table.innerHTML = '';

    // Проверка и очистка некорректных записей
    data.records = data.records.filter(record => 
        record && typeof record.total === 'number' && !isNaN(record.total)
    );

    // Сортировка записей по дате (новые сверху)
    const sortedRecords = [...data.records].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(a.date || 0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(b.date || 0);
        return dateB - dateA;
    });

    // Добавление записей с проверкой данных
    sortedRecords.forEach(record => {
        const row = table.insertRow();
        const shiftSalary = parseFloat(record.shiftSalary) || 0;
        const earnings = parseFloat(record.earnings) || 0;
        const tips = parseFloat(record.tips) || 0;
        const total = parseFloat(record.total) || 0;
        
        row.innerHTML = `
            <td>${record.date || 'Не указана'}</td>
            <td>${shiftSalary.toFixed(2)}</td>
            <td>${earnings.toFixed(2)}</td>
            <td>${tips.toFixed(2)}</td>
            <td>${total.toFixed(2)}</td>
        `;
    });

    // Добавление итоговой строки
    if (data.records.length > 0) {
        const totalShiftSalary = data.records.reduce((sum, r) => sum + (parseFloat(r.shiftSalary) || 0), 0);
        const totalEarnings = data.records.reduce((sum, r) => sum + (parseFloat(r.earnings) || 0), 0);
        const totalTips = data.records.reduce((sum, r) => sum + (parseFloat(r.tips) || 0), 0);
        const totalOverall = data.records.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        
        const totalRow = table.insertRow();
        totalRow.innerHTML = `
            <td style="font-weight: bold;">Итого:</td>
            <td>${totalShiftSalary.toFixed(2)}</td>
            <td>${totalEarnings.toFixed(2)}</td>
            <td>${totalTips.toFixed(2)}</td>
            <td>${totalOverall.toFixed(2)}</td>
        `;
    } else {
        const emptyRow = table.insertRow();
        emptyRow.innerHTML = `<td colspan="5" style="text-align: center; color: var(--text-secondary);">Нет данных</td>`;
    }
}

// Экспорт в Excel
function exportToExcel() {
    if (!data.records || data.records.length === 0) {
        showNotification('Нет данных для экспорта', 'error');
        return;
    }

    try {
        // Подготовка данных для Excel
        const excelData = [
            ['Дата', 'Оклад за смену', 'Продажи заведению', 'Процент (%)', 'Доход от продаж', 'Чаевые', 'Итого']
        ];

        data.records.forEach(record => {
            excelData.push([
                record.date || '',
                parseFloat(record.shiftSalary) || 0,
                parseFloat(record.sales) || 0,
                parseFloat(record.percentage) || 0,
                parseFloat(record.earnings) || 0,
                parseFloat(record.tips) || 0,
                parseFloat(record.total) || 0
            ]);
        });

        // Добавление итогов
        const totalShiftSalary = data.records.reduce((sum, r) => sum + (parseFloat(r.shiftSalary) || 0), 0);
        const totalEarnings = data.records.reduce((sum, r) => sum + (parseFloat(r.earnings) || 0), 0);
        const totalTips = data.records.reduce((sum, r) => sum + (parseFloat(r.tips) || 0), 0);
        const totalOverall = data.records.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        
        excelData.push(['', '', '', '', '', '', '']);
        excelData.push([
            'Итого', 
            totalShiftSalary.toFixed(2), 
            '', 
            '', 
            totalEarnings.toFixed(2), 
            totalTips.toFixed(2), 
            totalOverall.toFixed(2)
        ]);

        // Создание рабочей книги
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Статистика');

        // Экспорт
        const fileName = `waiter_stats_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showNotification('Данные экспортированы в Excel', 'success');
    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showNotification('Ошибка экспорта в Excel', 'error');
    }
}

// Экспорт всех данных
function exportAllData() {
    try {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `waiter_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('Все данные экспортированы', 'success');
    } catch (error) {
        console.error('Ошибка экспорта данных:', error);
        showNotification('Ошибка экспорта данных', 'error');
    }
}

// Импорт данных
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileContent = e.target.result;
            let importedData;

            // Определение типа файла и парсинг
            if (file.name.endsWith('.json')) {
                importedData = JSON.parse(fileContent);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                importedData = parseExcelData(fileContent);
            } else if (file.name.endsWith('.csv')) {
                importedData = parseCSVData(fileContent);
            } else {
                throw new Error('Неподдерживаемый формат файла');
            }

            // Валидация импортированных данных
            if (validateImportedData(importedData)) {
                // Слияние данных
                data = mergeData(data, importedData);
                saveData();
                
                // Обновление интерфейса
                updateMainScreen();
                updateGoalsDisplay();
                
                showNotification('Данные успешно импортированы', 'success');
                closeModal('dataModal');
            } else {
                showNotification('Некорректный формат данных', 'error');
            }
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            showNotification('Ошибка импорта данных', 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('Ошибка чтения файла', 'error');
    };
    
    if (file.name.endsWith('.json')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

// Парсинг Excel данных
function parseExcelData(fileContent) {
    const workbook = XLSX.read(fileContent, { type: 'binary' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    // Преобразование данных из Excel в нашу структуру
    const records = [];
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length >= 7) {
            const shiftSalary = parseFloat(row[1]) || 0;
            const sales = parseFloat(row[2]) || 0;
            const percentage = parseFloat(row[3]) || 0;
            const earnings = parseFloat(row[4]) || 0;
            const tips = parseFloat(row[5]) || 0;
            const total = parseFloat(row[6]) || 0;
            
            records.push({
                id: Date.now() + Math.random(),
                date: row[0] || new Date().toLocaleDateString('ru-RU'),
                timestamp: new Date().toISOString(),
                shiftSalary: shiftSalary,
                sales: sales,
                percentage: percentage,
                earnings: earnings,
                tips: tips,
                total: total
            });
        }
    }
    
    return { records, version: DATA_VERSION };
}

// Парсинг CSV данных
function parseCSVData(fileContent) {
    const lines = fileContent.split('\n');
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',');
        if (cells.length >= 7) {
            const shiftSalary = parseFloat(cells[1]) || 0;
            const sales = parseFloat(cells[2]) || 0;
            const percentage = parseFloat(cells[3]) || 0;
            const earnings = parseFloat(cells[4]) || 0;
            const tips = parseFloat(cells[5]) || 0;
            const total = parseFloat(cells[6]) || 0;
            
            records.push({
                id: Date.now() + Math.random(),
                date: cells[0] || new Date().toLocaleDateString('ru-RU'),
                timestamp: new Date().toISOString(),
                shiftSalary: shiftSalary,
                sales: sales,
                percentage: percentage,
                earnings: earnings,
                tips: tips,
                total: total
            });
        }
    }
    
    return { records, version: DATA_VERSION };
}

// Валидация импортированных данных
function validateImportedData(importedData) {
    if (!importedData) return false;
    
    // Проверка структуры данных
    if (importedData.records && Array.isArray(importedData.records)) {
        return importedData.records.every(record => 
            record && 
            typeof record.total === 'number' && 
            !isNaN(record.total)
        );
    }
    
    return false;
}

// Слияние данных
function mergeData(currentData, importedData) {
    const merged = { ...currentData };
    
    // Слияние записей с проверкой дубликатов
    if (importedData.records) {
        const existingIds = new Set(currentData.records.map(r => r.id));
        const newRecords = importedData.records.filter(record => 
            !existingIds.has(record.id)
        );
        merged.records = [...currentData.records, ...newRecords];
    }
    
    // Слияние целей
    if (importedData.goals) {
        const existingGoalIds = new Set(currentData.goals.map(g => g.id));
        const newGoals = importedData.goals.filter(goal => 
            !existingGoalIds.has(goal.id)
        );
        merged.goals = [...currentData.goals, ...newGoals];
    }
    
    // Обновление общего заработка
    merged.totalEarnings = merged.records.reduce((sum, record) => sum + (parseFloat(record.total) || 0), 0);
    
    return merged;
}

// Очистка всех данных
function clearAllData() {
    if (confirm('Вы уверены, что хотите удалить все данные? Это действие нельзя отменить.')) {
        data = initializeDefaultData();
        saveData(data);
        
        updateMainScreen();
        updateGoalsDisplay();
        
        showNotification('Все данные очищены', 'success');
        closeModal('dataModal');
    }
}

// Сохранение выплаты
function savePayout() {
    const amountInput = document.getElementById('payoutAmount');
    const amount = parseFloat(amountInput.value) || 0;

    if (amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }

    // Инициализируем массив выплат, если его нет
    if (!data.payouts) {
        data.payouts = [];
    }

    const payout = {
        id: Date.now() + Math.random(),
        date: new Date().toLocaleDateString('ru-RU'),
        amount: amount
    };

    data.payouts.push(payout);
    saveData();

    // Обновляем карточку выплат и очищаем поле ввода
    updatePayoutsCard();
    amountInput.value = '';

    closeModal('payoutModal');
    showNotification('Выплата добавлена', 'success');
}

// Обновление карточки выплат
function updatePayoutsCard() {
    const totalPayouts = data.payouts ? data.payouts.reduce((sum, p) => sum + p.amount, 0) : 0;

    // Суммируем только оклад + доход (без чаевых)
    const totalEarnings = data.records ? data.records.reduce((sum, r) => sum + (parseFloat(r.shiftSalary) + parseFloat(r.earnings)), 0) : 0;

    const unpaid = totalEarnings - totalPayouts;

    document.getElementById('paidAmount').textContent = totalPayouts.toFixed(2) + ' ₽';
    document.getElementById('unpaidAmount').textContent = unpaid.toFixed(2) + ' ₽';

    // Последняя дата выплаты
    if (data.payouts && data.payouts.length > 0) {
        const lastPayout = data.payouts[data.payouts.length - 1];
        document.getElementById('lastPayoutDate').textContent = lastPayout.date;
    } else {
        document.getElementById('lastPayoutDate').textContent = '—';
    }
}


// Инициализация главного экрана
function updateMainScreen() {
    updateTodayCard();
    updateYesterdayCard();
    updateBestShiftCard();
    updateGoalsDisplay();
    updatePayoutsCard(); // ✅ обновляем карточку выплат при загрузке
}
