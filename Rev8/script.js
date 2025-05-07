let db;
let currentUser = null;

// Configuración de Socket.IO
const socket = io();

// Inicialización de la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.error("Tu navegador no soporta IndexedDB");
            reject("Tu navegador no soporta IndexedDB");
            return;
        }

        const request = indexedDB.open('VolkswagenTallerDB', 6); // Cambiado nombre y versión

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos:', event.target.error);
            reject(event.target.error);
        };

        request.onblocked = (event) => {
            console.warn('La base de datos está bloqueada. Por favor, cierre otras pestañas con esta aplicación.');
            alert("La base de datos necesita actualizarse, pero está bloqueada. Por favor, cierre otras pestañas con esta aplicación y recargue la página.");
        };

        request.onupgradeneeded = (event) => {
            console.log('Actualizando la base de datos...');
            db = event.target.result;
            const transaction = event.target.transaction;

            if (!db.objectStoreNames.contains('citas')) {
                const citasStore = db.createObjectStore('citas', { keyPath: 'id', autoIncrement: true });
                citasStore.createIndex('fecha', 'fecha', { unique: false });
                citasStore.createIndex('clienteId', 'clienteId', { unique: false });
                citasStore.createIndex('status', 'status', { unique: false });
            }

            if (!db.objectStoreNames.contains('inventario')) {
                const inventarioStore = db.createObjectStore('inventario', { keyPath: 'id', autoIncrement: true });
                inventarioStore.createIndex('categoria', 'category', { unique: false });
                inventarioStore.createIndex('proveedor', 'supplier', { unique: false });
                inventarioStore.createIndex('code', 'code', { unique: true });
            }

            let clientesStore;
            if (db.objectStoreNames.contains('clientes')) {
                 clientesStore = transaction.objectStore('clientes');
            } else {
                clientesStore = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
            }
            if (!clientesStore.indexNames.contains('nombre')) {
                clientesStore.createIndex('nombre', 'nombre', { unique: false });
            }
            if (!clientesStore.indexNames.contains('placa')) {
                 clientesStore.createIndex('placa', 'placa', { unique: false });
            }

            if (!db.objectStoreNames.contains('mecanicos')) {
                const mecanicosStore = db.createObjectStore('mecanicos', { keyPath: 'id', autoIncrement: true });
                mecanicosStore.createIndex('usuario', 'usuario', { unique: true });
            }

            if (!db.objectStoreNames.contains('mantenimientos')) {
                const mantenimientosStore = db.createObjectStore('mantenimientos', { keyPath: 'id', autoIncrement: true });
                mantenimientosStore.createIndex('fecha', 'fecha', { unique: false });
                mantenimientosStore.createIndex('tipo', 'tipo', { unique: false });
                mantenimientosStore.createIndex('clienteId', 'clienteId', { unique: false });
            }

            if (!db.objectStoreNames.contains('serviceOrders')) {
                const serviceOrdersStore = db.createObjectStore('serviceOrders', { keyPath: 'id', autoIncrement: true });
                serviceOrdersStore.createIndex('clienteId', 'clienteId', { unique: false });
                serviceOrdersStore.createIndex('entryDate', 'entryDate', { unique: false });
                serviceOrdersStore.createIndex('status', 'status', { unique: false });
                serviceOrdersStore.createIndex('mechanicId', 'mechanicId', { unique: false });
                 console.log("Object store 'serviceOrders' created.");
            }
            console.log('Base de datos actualizada correctamente');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Base de datos inicializada correctamente');
            db.onversionchange = (event) => {
                db.close();
                alert("La base de datos está desactualizada. Por favor, recarga la página.");
            };
            resolve(db);
        };
    });
}

// Funciones de autenticación
function login(username, password) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("La base de datos no está inicializada.");
            return;
        }
        const transaction = db.transaction(['mecanicos'], 'readonly');
        const store = transaction.objectStore('mecanicos');
        const index = store.index('usuario');
        const request = index.get(username);

        request.onsuccess = (event) => {
            const mechanic = event.target.result;
            if (mechanic && mechanic.contraseña === password) {
                currentUser = mechanic;
                resolve(true);
            } else if (username === 'admin' && password === '1303') {
                currentUser = { id: 0, usuario: 'admin', isAdmin: true };
                resolve(true);
            } else {
                reject('Usuario o contraseña incorrectos');
            }
        };
        request.onerror = (event) => {
            reject('Error al buscar usuario');
        };
    });
}

// Funciones de gestión de clientes
function addClient(client) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("BD no lista."); return; }
        const transaction = db.transaction(['clientes'], 'readwrite');
        const store = transaction.objectStore('clientes');
        const request = store.add({ ...client, proxima_visita: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] });
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject('Error: ' + e.target.error.message);
    });
}

function getClients() {
    return new Promise((resolve, reject) => {
        if (!db) { reject("BD no lista."); return; }
        const tx = db.transaction(['clientes'], 'readonly');
        const store = tx.objectStore('clientes');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject('Error: ' + e.target.error.message);
    });
}

function deleteClient(id) {
    if (!currentUser?.isAdmin) {
        alert('Sin permisos.');
        return;
    }
    if (!confirm(`Eliminar cliente ID ${id}?`)) return;
    return new Promise((resolve, reject) => {
        if (!db) { reject("BD no lista."); return; }
        const tx = db.transaction(['clientes'], 'readwrite');
        const store = tx.objectStore('clientes');
        const req = store.delete(id);
        req.onsuccess = () => { updateClientsTable(); resolve(); };
        req.onerror = (e) => reject('Error: ' + e.target.error.message);
    });
}

// Funciones de gestión de mecánicos
function addMechanic(mechanic) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) { reject('Sin permisos.'); return; }
        if (!db) { reject("BD no lista."); return; }
        const tx = db.transaction(['mecanicos'], 'readwrite');
        const store = tx.objectStore('mecanicos');
        const req = store.add(mechanic);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error.name === 'ConstraintError' ? 'Usuario ya existe.' : 'Error: ' + e.target.error.message);
    });
}

function getMechanics() {
    return new Promise((resolve, reject) => {
        // Allow all logged in users to see mechanics for assignment in service orders, not just admin for viewing list.
        if (!currentUser) { reject('No autenticado.'); return; }
        if (!db) { reject("BD no lista."); return; }
        const tx = db.transaction(['mecanicos'], 'readonly');
        const store = tx.objectStore('mecanicos');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject('Error: ' + e.target.error.message);
    });
}

function deleteMechanic(id) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) { reject('Sin permisos.'); return; }
        if (!db) { reject("BD no lista."); return; }
        if (!confirm(`Eliminar mecánico ID ${id}?`)) return reject('Cancelado.');
        const tx = db.transaction(['mecanicos'], 'readwrite');
        const store = tx.objectStore('mecanicos');
        const req = store.delete(id);
        req.onsuccess = () => { updateMechanicsTable(); resolve(); };
        req.onerror = (e) => reject('Error: ' + e.target.error.message);
    });
}

// Funciones de Mantenimientos (para análisis y historial)
function addMaintenanceData(data) {
    return new Promise((resolve, reject) => {
        if (!currentUser) { reject('No autenticado.'); return; }
        if (!db) { reject("BD no lista."); return; }
        const tx = db.transaction(['mantenimientos'], 'readwrite');
        const store = tx.objectStore('mantenimientos');
        const req = store.add({ ...data, fecha: new Date().toISOString(), mecanicoId: currentUser.id, mecanicoUsuario: currentUser.usuario, estado: 'completado' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject('Error: ' + e.target.error.message);
    });
}

function getMaintenanceData(period) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) { reject('Sin permisos.'); return; }
        if (!db) { reject("BD no lista."); return; }
        const tx = db.transaction(['mantenimientos'], 'readonly');
        const store = tx.objectStore('mantenimientos');
        const req = store.getAll();
        req.onsuccess = () => {
            const data = req.result; let filteredData = data;
            if (period !== 999) { const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - period); filteredData = data.filter(item => new Date(item.fecha) >= cutoff); }
            resolve(filteredData);
        };
        req.onerror = (e) => reject('Error: ' + e.target.error.message);
    });
}

// Regresión Lineal
function calculateRegression(x, y) {
    if (!x || !y || x.length !== y.length || x.length === 0) {
        return { slope: NaN, intercept: NaN, rSquared: NaN };
    }
    const n = x.length;
    if (n < 2) {
        return { slope: NaN, intercept: NaN, rSquared: NaN };
    }
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    const denominator = (n * sumXX - sumX * sumX);
    if (Math.abs(denominator) < 1e-10) {
        return { slope: NaN, intercept: sumY / n, rSquared: NaN };
    }
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    const meanY = sumY / n;
    const totalSS = y.reduce((a, b) => a + Math.pow(b - meanY, 2), 0);
    if (Math.abs(totalSS) < 1e-10) {
        return { slope, intercept, rSquared: 1 };
    }
    const regressionSS = y.reduce((a, b, i) => {
        const predicted = slope * x[i] + intercept;
        return a + Math.pow(predicted - meanY, 2);
    }, 0);
    const rSquared = regressionSS / totalSS;
    return { slope, intercept, rSquared };
}

function generateAnalysis() {
    const period = parseInt(document.getElementById('analysisPeriod').value);
    getMaintenanceData(period).then(data => {
        const slopeSpan = document.getElementById('slope');
        const interceptSpan = document.getElementById('intercept');
        const rSquaredSpan = document.getElementById('rSquared');
        const predictionSpan = document.getElementById('prediction');
        slopeSpan.textContent = '-';
        interceptSpan.textContent = '-';
        rSquaredSpan.textContent = '-';
        predictionSpan.textContent = '-';

        if (window.myChart instanceof Chart) {
            window.myChart.destroy();
        }
        if (data.length < 2) {
            alert('Datos insuficientes para análisis.');
            return;
        }
        const validData = data.filter(item => typeof item.kilometraje === 'number' && typeof item.costo === 'number');
        if (validData.length < 2) {
            alert('Datos válidos insuficientes.');
            return;
        }
        const x = validData.map(item => item.kilometraje);
        const y = validData.map(item => item.costo);
        const regression = calculateRegression(x, y);
        if (isNaN(regression.slope)) {
            alert("No se pudo calcular regresión.");
            return;
        }
        slopeSpan.textContent = regression.slope.toFixed(4);
        interceptSpan.textContent = regression.intercept.toFixed(2);
        rSquaredSpan.textContent = isNaN(regression.rSquared) ? 'N/A' : regression.rSquared.toFixed(4);
        const prediction = regression.slope * 100000 + regression.intercept; // 1e5 is 100000
        predictionSpan.textContent = `$${prediction.toFixed(2)}`;
        const ctx = document.getElementById('regressionChart').getContext('2d');
        const minX = Math.min(...x);
        const maxX = Math.max(...x);
        const regressionLine = (isNaN(minX) || isNaN(maxX)) ? [] : [
            { x: minX, y: regression.slope * minX + regression.intercept },
            { x: maxX, y: regression.slope * maxX + regression.intercept }
        ];
        window.myChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Mantenimiento',
                        data: validData.map(item => ({ x: item.kilometraje, y: item.costo })),
                        backgroundColor: 'rgba(54,162,235,0.5)'
                    },
                    ...(regressionLine.length > 0 ? [{
                        label: 'Regresión',
                        data: regressionLine,
                        type: 'line',
                        fill: false,
                        borderColor: 'rgba(255,99,132,1)'
                    }] : [])
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Kilometraje' } },
                    y: { title: { display: true, text: 'Costo ($)' }, beginAtZero: true }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: { callbacks: { label: ctx_tooltip => `${ctx_tooltip.dataset.label}: (${ctx_tooltip.parsed.x.toLocaleString()} km, $${ctx_tooltip.parsed.y.toFixed(2)})` } }
                }
            }
        });
    }).catch(err => {
        console.error("Error en análisis:", err);
        alert('Error: ' + err);
    });
}

// UI
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('mainScreen').classList.add('d-none');
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('mainScreen').classList.remove('d-none');
    document.getElementById('userDisplay').textContent = currentUser.usuario;
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    if (currentUser.isAdmin) {
        adminOnlyElements.forEach(el => el.classList.remove('d-none'));
        document.querySelectorAll('.sidebar .nav-item').forEach(item => item.classList.remove('d-none'));
    } else {
        adminOnlyElements.forEach(el => el.classList.add('d-none'));
        document.querySelectorAll('.sidebar .nav-item.admin-only').forEach(item => item.classList.add('d-none'));
    }
    document.querySelector('.sidebar .nav-link[data-tab="dashboard"]').click(); // Default to dashboard
}

function updateClientsTable() {
    getClients().then(clients => {
        const tbody = document.getElementById('clientsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">No hay clientes.</td></tr>';
            return;
        }
        clients.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.id}</td>
                <td>${c.nombre || 'N/A'}</td>
                <td>${c.correo || 'N/A'}</td>
                <td>${c.marca_carro || 'N/A'} / ${c.modelo_carro || 'N/A'} (${c.anio_carro || 'N/A'})</td>
                <td>${c.placa || 'N/A'}</td>
                <td>${c.proxima_visita || 'N/A'}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="showClientDetails(${c.id})" title="Detalles Cliente"><i class="fas fa-address-card"></i></button>
                    <button class="btn btn-secondary btn-sm ms-1" onclick="showVehicleDetailsById(${c.id})" title="Detalles Vehículo"><i class="fas fa-car"></i></button>
                    ${currentUser.isAdmin ? `<button class="btn btn-danger btn-sm ms-1" onclick="deleteClient(${c.id})" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                </td>`;
            tbody.appendChild(tr);
        });
    }).catch(err => {
        const tbody = document.getElementById('clientsTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4">Error: ${err}</td></tr>`;
    });
}

function updateMechanicsTable() {
    if (!currentUser?.isAdmin) return;
    getMechanics().then(mechs => {
        const tbody = document.getElementById('mechanicsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (mechs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4">No hay mecánicos.</td></tr>';
            return;
        }
        mechs.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.id}</td>
                <td>${m.usuario}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteMechanic(${m.id})" title="Eliminar"><i class="fas fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
    }).catch(err => {
        const tbody = document.getElementById('mechanicsTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger p-4">Error: ${err}</td></tr>`;
    });
}

function createDefaultMechanic() {
    if (!db) return;
    const dm = { usuario: 'george1', contraseña: '0000' };
    const tx = db.transaction(['mecanicos'], 'readwrite');
    const st = tx.objectStore('mecanicos');
    const idx = st.index('usuario');
    const req = idx.get(dm.usuario);
    req.onsuccess = e => {
        if (!e.target.result) {
            const addReq = st.add(dm);
            addReq.onsuccess = () => console.log('Mecánico default creado');
            addReq.onerror = er => console.error("Error default mech:", er.target.error);
        } else {
            console.log("Default mech existe.");
        }
    };
    req.onerror = e => console.error("Error check default mech:", e.target.error);
}

function getClientHistory(clientId) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        const tx = db.transaction(['mantenimientos'], 'readonly');
        const st = tx.objectStore('mantenimientos');
        const idx = st.index('clienteId');
        const req = idx.getAll(clientId);
        req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
        req.onerror = e => reject('Error historial: ' + e.target.error.message);
    });
}

function showClientDetails(clientId) {
    if (!db) { alert("BD no lista."); return; }
    const modalEl = document.getElementById('clientDetailsModal');
    if (modalEl) modalEl.dataset.clientId = clientId; else return;

    const tx = db.transaction(['clientes'], 'readonly');
    const st = tx.objectStore('clientes');
    const req = st.get(clientId);
    req.onsuccess = e => {
        const c = e.target.result;
        if (c) {
            document.getElementById('modalClientName').textContent = c.nombre || 'N/A';
            document.getElementById('modalClientEmail').textContent = c.correo || 'N/A';
            document.getElementById('modalCarInfo').textContent = `${c.marca_carro || 'N/A'} ${c.modelo_carro || 'N/A'} (${c.anio_carro || 'N/A'}) - Placa: ${c.placa || 'N/A'}`;
            document.getElementById('modalLastRevision').textContent = c.revision || 'N/A';
            const visitHistTbody = document.getElementById('visitHistoryTable');
            visitHistTbody.innerHTML = '<tr><td colspan="6" class="text-center p-3"><div class="loading-spinner mx-auto"></div> Cargando...</td></tr>';
            getClientHistory(clientId).then(visits => {
                visitHistTbody.innerHTML = '';
                if (visits.length === 0) visitHistTbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay mantenimientos.</td></tr>';
                else visits.forEach(v => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${new Date(v.fecha).toLocaleDateString()}</td><td>${v.tipo || 'N/A'}</td><td>${v.kilometraje ? v.kilometraje.toLocaleString() + ' km' : 'N/A'}</td><td>${v.costo ? '$' + v.costo.toFixed(2) : 'N/A'}</td><td><span class="badge bg-success">${v.estado || 'Completado'}</span></td><td>${v.mecanicoUsuario || 'N/A'}</td>`;
                    visitHistTbody.appendChild(tr);
                });
                const chartCont = document.getElementById('clientExpensesChartContainer');
                const chartCanv = document.getElementById('clientExpensesChart');
                if (!chartCont || !chartCanv) return;
                if (currentUser.isAdmin && visits.filter(v => v.costo > 0).length > 0) {
                    chartCont.classList.remove('d-none');
                    const ctx = chartCanv.getContext('2d');
                    if (window.clientExpensesChart instanceof Chart) window.clientExpensesChart.destroy();
                    const monthlyData = {};
                    visits.forEach(v => {
                        if (v.costo && v.fecha) {
                            const d_date = new Date(v.fecha); // Renamed to avoid conflict
                            const mKey = `${d_date.getFullYear()}-${String(d_date.getMonth() + 1).padStart(2, '0')}`;
                            monthlyData[mKey] = (monthlyData[mKey] || 0) + v.costo;
                        }
                    });
                    const sortedMonths = Object.keys(monthlyData).sort();
                    const sortedCosts = sortedMonths.map(m => monthlyData[m]);
                    const monthLabels = sortedMonths.map(mKey => { const [y_year, m_month] = mKey.split('-'); return new Date(y_year, m_month - 1).toLocaleString('es-ES', { month: 'short', year: 'numeric' }) }); // Renamed
                    window.clientExpensesChart = new Chart(ctx, { type: 'bar', data: { labels: monthLabels, datasets: [{ label: 'Gastos Mensuales', data: sortedCosts, backgroundColor: 'rgba(54,162,235,0.7)' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Costo ($)' } } }, plugins: { tooltip: { callbacks: { label: ctx_tooltip => ` ${ctx_tooltip.dataset.label}: $${ctx_tooltip.parsed.y.toFixed(2)}` } } } } });
                } else {
                    chartCont.classList.add('d-none');
                    if (window.clientExpensesChart instanceof Chart) window.clientExpensesChart.destroy();
                }
                if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
            }).catch(err => {
                console.error("Error historial modal:", err);
                visitHistTbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar.</td></tr>';
                if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
            });
        } else {
            alert(`Cliente ID ${clientId} no encontrado.`);
        }
    };
    req.onerror = e_event => { // Renamed
        console.error("Error detalles cliente:", e_event.target.error);
        alert('Error al obtener detalles.');
    };
}


// Citas
function showAppointmentModal() {
    const sel = document.getElementById('appointmentClient');
    if (!sel) return;
    sel.innerHTML = '<option value="">Cargando...</option>';
    getClients().then(clients => {
        sel.innerHTML = '<option value="" selected disabled>Seleccione cliente...</option>';
        clients.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.nombre} (${c.placa || 'Sin Placa'})`;
            sel.appendChild(opt);
        });
    }).catch(err => { sel.innerHTML = '<option value="">Error.</option>'; });
    const today = new Date().toISOString().split('T')[0];
    const dateIn = document.getElementById('appointmentDate');
    if (dateIn) dateIn.min = today;
    const form = document.getElementById('appointmentForm');
    if (form) form.reset();
    const modalEl = document.getElementById('appointmentModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function addAppointment(appData) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        if (!currentUser) return reject("No autenticado.");
        const tx = db.transaction(['citas'], 'readwrite');
        const st = tx.objectStore('citas');
        const compApp = { ...appData, createdBy: currentUser.id, createdByName: currentUser.usuario, status: 'pendiente' };
        const req = st.add(compApp);
        req.onsuccess = () => { updateCalendar(); resolve(req.result); };
        req.onerror = e => reject('Error agendando: ' + e.target.error.message);
    });
}

function getAppointments(start, end) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        const tx = db.transaction(['citas'], 'readonly');
        const st = tx.objectStore('citas');
        const idx = st.index('fecha');
        const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
        const req = idx.getAll(range);
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject('Error citas: ' + e.target.error.message);
    });
}

function updateCalendar() {
    const monthIn = document.getElementById('calendarMonth');
    const calBody = document.getElementById('appointmentCalendar');
    if (!monthIn || !calBody) return;
    calBody.innerHTML = '<tr><td colspan="7" class="text-center p-5"><div class="loading-spinner mx-auto"></div> Cargando...</td></tr>';
    const [year, month] = monthIn.value.split('-').map(Number);
    if (!year || !month) { calBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger p-5">Fecha inválida.</td></tr>'; return; }
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const calStart = new Date(firstDay);
    calStart.setDate(calStart.getDate() - (calStart.getDay() === 0 ? 6 : calStart.getDay() - 1));
    const calEnd = new Date(year, month - 1, daysInMonth);
    calEnd.setDate(calEnd.getDate() + (7 - (calEnd.getDay() === 0 ? 7 : calEnd.getDay())));
    getAppointments(calStart, calEnd).then(apps => {
        calBody.innerHTML = '';
        const appsByDate = {};
        apps.forEach(app => { const dKey = app.fecha.substring(0, 10); if (!appsByDate[dKey]) appsByDate[dKey] = []; appsByDate[dKey].push(app); });
        let currDate = new Date(calStart);
        while (currDate < calEnd) {
            const weekRow = calBody.insertRow();
            for (let i = 0; i < 7; i++) {
                const cell = weekRow.insertCell(); cell.classList.add('calendar-day');
                const dKey = currDate.toISOString().substring(0, 10);
                if (currDate.getMonth() !== month - 1) cell.classList.add('other-month');
                else if (currDate.toDateString() === new Date().toDateString()) cell.classList.add('bg-info-subtle');
                const dayNumDiv = document.createElement('div'); dayNumDiv.classList.add('day-number'); dayNumDiv.textContent = currDate.getDate(); cell.appendChild(dayNumDiv);
                if (appsByDate[dKey]) {
                    appsByDate[dKey].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                    appsByDate[dKey].forEach(app => {
                        const appDiv = document.createElement('div'); appDiv.classList.add('appointment-card', app.status || 'pendiente');
                        appDiv.innerHTML = `<small><strong>${new Date(app.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></small><small>${app.clientName || 'Cliente?'}</small><small><em>${app.service || 'Servicio?'}</em></small>`;
                        appDiv.title = `Cliente: ${app.clientName}\nServicio: ${app.service}\nEstado: ${app.status}\nNotas: ${app.notes || 'Ninguna'}`; cell.appendChild(appDiv);
                    });
                }
                currDate.setDate(currDate.getDate() + 1);
            }
        }
    }).catch(err => { calBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-5">Error: ${err}</td></tr>`; });
}


// Inventario
function showInventoryModal(itemId = null) {
    const modalEl = document.getElementById('inventoryModal'); if (!modalEl) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const form = document.getElementById('inventoryForm');
    const title = document.getElementById('inventoryModalTitle');
    const hiddenId = document.getElementById('editItemId');
    form.reset(); hiddenId.value = '';
    if (itemId) { title.textContent = 'Editar Pieza'; editInventoryItem(itemId); }
    else title.textContent = 'Agregar Pieza';
    modal.show();
}

function editInventoryItem(id) {
    if (!db) { alert("BD no lista."); return; }
    const tx = db.transaction(['inventario'], 'readonly');
    const st = tx.objectStore('inventario');
    const req = st.get(id);
    req.onsuccess = e => {
        const item = e.target.result;
        if (item) {
            document.getElementById('editItemId').value = item.id;
            document.getElementById('partCode').value = item.code || '';
            document.getElementById('partName').value = item.name || '';
            document.getElementById('partCategory').value = item.category || '';
            document.getElementById('partStock').value = item.stock === undefined ? '' : item.stock;
            document.getElementById('partMinStock').value = item.minStock === undefined ? '' : item.minStock;
            document.getElementById('partPrice').value = item.price === undefined ? '' : item.price;
            document.getElementById('partSupplier').value = item.supplier || '';
            document.getElementById('partLocation').value = item.location || '';
        } else {
            alert(`Pieza ID ${id} no encontrada.`);
            const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
            if (modal) modal.hide();
        }
    };
    req.onerror = e_event => alert('Error cargando pieza.'); // Renamed
}

function saveInventoryItem() {
    const itemId = document.getElementById('editItemId').value;
    const part = {
        code: document.getElementById('partCode').value.trim(),
        name: document.getElementById('partName').value.trim(),
        category: document.getElementById('partCategory').value,
        stock: parseInt(document.getElementById('partStock').value),
        minStock: parseInt(document.getElementById('partMinStock').value),
        price: parseFloat(document.getElementById('partPrice').value),
        supplier: document.getElementById('partSupplier').value.trim(),
        location: document.getElementById('partLocation').value.trim()
    };
    if (!part.code || !part.name || !part.category || isNaN(part.stock) || isNaN(part.minStock) || isNaN(part.price)) {
        alert('Complete campos requeridos.'); return;
    }
    const promise = itemId ? updateInventoryItem({ ...part, id: parseInt(itemId) }) : addInventoryItem(part);
    promise.then(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
        if (modal) modal.hide();
        document.getElementById('inventoryForm').reset();
        document.getElementById('editItemId').value = '';
        updateInventoryTable();
        alert(`Pieza ${itemId ? 'actualizada' : 'guardada'}.`);
    }).catch(err => alert('Error: ' + err));
}

function addInventoryItem(part) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        const tx = db.transaction(['inventario'], 'readwrite');
        const st = tx.objectStore('inventario');
        const req = st.add(part);
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject(e.target.error.name === 'ConstraintError' ? 'Código ya existe.' : 'Error: ' + e.target.error.message);
    });
}

function updateInventoryItem(part) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        const tx = db.transaction(['inventario'], 'readwrite');
        const st = tx.objectStore('inventario');
        const req = st.put(part);
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject(e.target.error.name === 'ConstraintError' ? 'Código ya existe (conflicto).' : 'Error: ' + e.target.error.message);
    });
}

function deleteInventoryItem(id) {
    if (!confirm(`Eliminar pieza ID ${id}?`)) return;
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        const tx = db.transaction(['inventario'], 'readwrite');
        const st = tx.objectStore('inventario');
        const req = st.delete(id);
        req.onsuccess = () => { updateInventoryTable(); resolve(); };
        req.onerror = e => reject('Error: ' + e.target.error.message);
    });
}

function getInventoryItems() {
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        const tx = db.transaction(['inventario'], 'readonly');
        const st = tx.objectStore('inventario');
        const req = st.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject('Error: ' + e.target.error.message);
    });
}

function updateInventoryTable() {
    getInventoryItems().then(items => {
        const tbody = document.getElementById('inventoryTableBody'); if (!tbody) return;
        tbody.innerHTML = '';
        if (items.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4">Inventario vacío.</td></tr>'; return; }
        items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        items.forEach(item => {
            const stockLvlClass = item.stock <= item.minStock ? 'table-danger' : item.stock <= item.minStock * 1.2 ? 'table-warning' : '';
            const tr = document.createElement('tr'); tr.className = stockLvlClass;
            tr.innerHTML = `
                <td>${item.code || 'N/A'}</td><td>${item.name || 'N/A'}</td><td>${item.category || 'N/A'}</td>
                <td>${item.stock !== undefined ? item.stock : 'N/A'} ${item.stock <= item.minStock ? '<i class="fas fa-exclamation-triangle text-danger ms-1" title="Stock Bajo"></i>' : ''}</td>
                <td>${item.minStock !== undefined ? item.minStock : 'N/A'}</td><td>${item.price !== undefined ? '$' + item.price.toFixed(2) : 'N/A'}</td>
                <td>${item.supplier || 'N/A'}</td><td>${item.location || 'N/A'}</td>
                <td><button class="btn btn-sm btn-warning" onclick="showInventoryModal(${item.id})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger ms-1" onclick="deleteInventoryItem(${item.id})" title="Eliminar"><i class="fas fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
    }).catch(err => {
        const tbody = document.getElementById('inventoryTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger p-4">Error: ${err}</td></tr>`;
    });
}


// Reportes
function generateReport() {
    const type = document.getElementById('reportType').value;
    const month = document.getElementById('reportMonth').value;
    const content = document.getElementById('reportContent'); if (!content) return;
    content.innerHTML = '<div class="text-center p-4"><div class="loading-spinner mx-auto"></div><p class="mt-2">Generando...</p></div>';
    if (!month && (type === 'services' || type === 'mechanics')) {
        content.innerHTML = '<div class="alert alert-warning">Seleccione mes para este tipo de reporte.</div>'; return;
    }
    const [year, monthNum] = month ? month.split('-').map(Number) : [null, null];
    const startDate = month ? new Date(year, monthNum - 1, 1) : null;
    const endDate = month ? new Date(year, monthNum, 1) : null;

    switch (type) {
        case 'services': generateServiceReport(startDate, endDate); break;
        case 'mechanics': generateMechanicReport(startDate, endDate); break;
        case 'inventory': generateInventoryReport(); break;
        case 'vehicles': generateVehicleReport(); break;
        default: content.innerHTML = '<div class="alert alert-danger">Tipo inválido.</div>';
    }
}

function getMaintenanceDataForAllTime() {
    return new Promise((resolve, reject) => {
        if (!db) return reject("BD no lista.");
        const tx = db.transaction(['mantenimientos'], 'readonly');
        const st = tx.objectStore('mantenimientos');
        const req = st.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject('Error mantenimientos: ' + e.target.error.message);
    });
}

function generateServiceReport(start, end) {
    getMaintenanceDataForAllTime().then(allM => {
        const content = document.getElementById('reportContent'); if (!content) return;
        const filteredM = allM.filter(m => { const d = new Date(m.fecha); return d >= start && d < end; });
        if (filteredM.length === 0) { content.innerHTML = `<h4>Reporte Servicios (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})</h4><div class="alert alert-info">No hay servicios.</div>`; return; }
        const counts = {}; let totalCost = 0, prev = 0, corr = 0;
        filteredM.forEach(m => { const type = m.tipo || 'Desc.'; counts[type] = (counts[type] || 0) + 1; totalCost += m.costo || 0; if (m.tipo === 'preventivo') prev++; if (m.tipo === 'correctivo') corr++; });
        let html = `<h4>Reporte Servicios (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})</h4><p><strong>Total:</strong> ${filteredM.length}</p><p><strong>Costo Total:</strong> $${totalCost.toFixed(2)}</p><p><strong>Preventivos:</strong> ${prev}</p><p><strong>Correctivos:</strong> ${corr}</p><h5 class="mt-3">Por Tipo:</h5><table class="table table-sm table-striped"><thead><tr><th>Tipo</th><th>Cant.</th></tr></thead><tbody>`;
        Object.entries(counts).sort(([, a], [, b]) => b - a).forEach(([serv, count]) => html += `<tr><td>${serv}</td><td>${count}</td></tr>`);
        html += '</tbody></table>'; content.innerHTML = html;
    }).catch(err => { content.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

function generateMechanicReport(start, end) {
    getMaintenanceDataForAllTime().then(allM => {
        const content = document.getElementById('reportContent'); if (!content) return;
        const filteredM = allM.filter(m => new Date(m.fecha) >= start && new Date(m.fecha) < end);
        if (filteredM.length === 0) { content.innerHTML = `<h4>Rendimiento Mecánicos (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})</h4><div class="alert alert-info">No hay datos.</div>`; return; }
        const perf = {};
        filteredM.forEach(m => { const mech = m.mecanicoUsuario || 'Desc.'; if (!perf[mech]) perf[mech] = { count: 0, totalCost: 0, services: {} }; perf[mech].count++; perf[mech].totalCost += m.costo || 0; const sType = m.tipo || 'N/A'; perf[mech].services[sType] = (perf[mech].services[sType] || 0) + 1; });
        let html = `<h4>Rendimiento Mecánicos (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})</h4><table class="table table-sm table-striped"><thead><tr><th>Mecánico</th><th># Serv.</th><th>Costo Total</th><th>Detalle</th></tr></thead><tbody>`;
        Object.entries(perf).sort(([, a], [, b]) => b.count - a.count).forEach(([mech, data]) => { let sDet = Object.entries(data.services).map(([t, c]) => `${t}: ${c}`).join('<br>'); html += `<tr><td>${mech}</td><td>${data.count}</td><td>$${data.totalCost.toFixed(2)}</td><td><small>${sDet}</small></td></tr>`; });
        html += '</tbody></table>'; content.innerHTML = html;
    }).catch(err => { content.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

function generateInventoryReport() {
    getInventoryItems().then(items => {
        const content = document.getElementById('reportContent'); if (!content) return;
        if (items.length === 0) { content.innerHTML = '<h4>Reporte Inventario</h4><div class="alert alert-info">Vacío.</div>'; return; }
        const totalVal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0);
        const lowStock = items.filter(item => item.stock <= item.minStock);
        const byCat = items.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});
        let html = `<h4>Reporte Inventario (Actual)</h4><p><strong># Tipos Piezas:</strong> ${items.length}</p><p><strong>Valor Total Stock:</strong> $${totalVal.toFixed(2)}</p><p><strong>Piezas Stock Bajo (${lowStock.length}):</strong></p>`;
        if (lowStock.length > 0) { html += '<ul class="list-group mb-3 list-group-flush">'; lowStock.forEach(i => html += `<li class="list-group-item list-group-item-warning p-2 d-flex justify-content-between"><span>${i.name} (${i.code})</span> <span class="badge bg-danger">Stock: ${i.stock} (Min: ${i.minStock})</span></li>`); html += '</ul>'; }
        else html += '<p class="text-success">Ninguna con stock bajo.</p>';
        html += '<h5 class="mt-3">Por Categoría:</h5><table class="table table-sm table-striped"><thead><tr><th>Cat.</th><th>Cant.</th></tr></thead><tbody>';
        Object.entries(byCat).sort(([, a], [, b]) => b - a).forEach(([cat, count]) => html += `<tr><td>${cat}</td><td>${count}</td></tr>`);
        html += '</tbody></table>'; content.innerHTML = html;
    }).catch(err => { content.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

function generateVehicleReport() {
    getClients().then(clients => {
        const content = document.getElementById('reportContent'); if (!content) return;
        if (clients.length === 0) { content.innerHTML = '<h4>Reporte Vehículos</h4><div class="alert alert-info">No hay.</div>'; return; }
        const byBrand = clients.reduce((acc, c) => { const b = c.marca_carro || 'Desc.'; acc[b] = (acc[b] || 0) + 1; return acc; }, {});
        const byYear = clients.reduce((acc, c) => { const y = c.anio_carro || 'Desc.'; acc[y] = (acc[y] || 0) + 1; return acc; }, {});
        let html = `<h4>Reporte Vehículos</h4><p><strong>Total:</strong> ${clients.length}</p><div class="row"><div class="col-md-6"><h5 class="mt-3">Por Marca:</h5><table class="table table-sm table-striped"><thead><tr><th>Marca</th><th>Cant.</th></tr></thead><tbody>`;
        Object.entries(byBrand).sort(([, a], [, b]) => b - a).forEach(([b, count]) => html += `<tr><td>${b}</td><td>${count}</td></tr>`);
        html += '</tbody></table></div><div class="col-md-6"><h5 class="mt-3">Por Año:</h5><table class="table table-sm table-striped"><thead><tr><th>Año</th><th>Cant.</th></tr></thead><tbody>';
        Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0])).forEach(([y, count]) => html += `<tr><td>${y}</td><td>${count}</td></tr>`);
        html += '</tbody></table></div></div>'; content.innerHTML = html;
    }).catch(err => { content.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

// Vehículos
function searchVehicle() {
    const term = document.getElementById('vehicleSearch').value.toLowerCase().trim();
    const resDiv = document.getElementById('vehicleSearchResults'); if (!resDiv) return;
    resDiv.innerHTML = '<div class="text-center p-3"><div class="loading-spinner mx-auto"></div> Buscando...</div>';
    if (!term) { resDiv.innerHTML = '<p class="text-muted text-center p-3">Ingrese placa o cliente.</p>'; return; }
    getClients().then(clients => {
        const matching = clients.filter(c => (c.placa && c.placa.toLowerCase().includes(term)) || (c.nombre && c.nombre.toLowerCase().includes(term)));
        if (matching.length > 0) {
            resDiv.innerHTML = '<ul class="list-group">';
            matching.forEach(c => resDiv.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center"><span><strong>${c.nombre || 'N/A'}</strong> - ${c.marca_carro || '?'} ${c.modelo_carro || '?'} (${c.anio_carro || '?'}) - Placa: ${c.placa || 'N/A'}</span><button class="btn btn-sm btn-info" onclick="showVehicleDetailsById(${c.id})"><i class="fas fa-eye"></i> Ver</button></li>`);
            resDiv.innerHTML += '</ul>';
        } else {
            resDiv.innerHTML = '<div class="alert alert-warning text-center">No se encontraron.</div>';
        }
    }).catch(err => { resDiv.innerHTML = '<div class="alert alert-danger text-center">Error.</div>'; });
}

function showVehicleDetailsById(clientId) {
    if (!db) { alert("BD no lista."); return; }
    const tx = db.transaction(['clientes'], 'readonly');
    const st = tx.objectStore('clientes');
    const req = st.get(clientId);
    req.onsuccess = e => { const c = e.target.result; if (c) showVehicleDetails(c); else alert(`Vehículo ID ${clientId} no encontrado.`); };
    req.onerror = e_event => alert('Error cargando vehículo.'); // Renamed
}

function showVehicleDetails(client) {
    const modalEl = document.getElementById('vehicleModal'); if (!modalEl) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    document.getElementById('vehiclePlate').textContent = client.placa || 'N/A';
    document.getElementById('vehicleMake').textContent = client.marca_carro || 'N/A';
    document.getElementById('vehicleModel').textContent = client.modelo_carro || 'N/A';
    document.getElementById('vehicleYear').textContent = client.anio_carro || 'N/A';
    const mileage = client.kilometraje !== undefined ? client.kilometraje.toLocaleString() + ' km' : 'N/A';
    document.getElementById('vehicleMileage').textContent = mileage;
    document.getElementById('vehicleSoat').textContent = client.soat ? new Date(client.soat).toLocaleDateString() : 'No reg.';
    document.getElementById('vehicleTechReview').textContent = client.revision_tecnica ? new Date(client.revision_tecnica).toLocaleDateString() : 'No reg.';
    document.getElementById('nextMaintenance').textContent = calculateNextMaintenance(client.kilometraje);
    loadVehicleHistory(client.id);
    modal.show();
}

function calculateNextMaintenance(km) {
    if (km === undefined || km === null || isNaN(km)) return 'Kilometraje no reg.';
    const interval = 5000;
    const nextKm = Math.ceil((km + 1) / interval) * interval;
    return `A los ${nextKm.toLocaleString()} km (aprox.)`;
}

function loadVehicleHistory(clientId) {
    const tbody = document.getElementById('vehicleHistoryTableBody'); if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3"><div class="loading-spinner mx-auto"></div> Cargando...</td></tr>';
    getClientHistory(clientId).then(visits => {
        tbody.innerHTML = '';
        if (visits.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3">No hay historial.</td></tr>'; return; }
        visits.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(v.fecha).toLocaleDateString()}</td><td>${v.tipo || 'N/A'}</td><td>${v.kilometraje ? v.kilometraje.toLocaleString() + ' km' : 'N/A'}</td><td>${v.mecanicoUsuario || 'N/A'}</td><td>${v.costo ? '$' + v.costo.toFixed(2) : 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }).catch(err => { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger p-3">Error historial.</td></tr>'; });
}

// Exportación Cliente Específico
async function getClientDataForExport(clientId) {
    if (!db) throw new Error("BD no lista.");
    const clientTx = db.transaction(['clientes'], 'readonly');
    const clientSt = clientTx.objectStore('clientes');
    const clientReq = clientSt.get(clientId);
    const client = await new Promise((res, rej) => { clientReq.onsuccess = e => res(e.target.result); clientReq.onerror = e => rej('Error cliente: ' + e.target.error); });
    if (!client) throw new Error(`Cliente ID ${clientId} no encontrado.`);
    const history = await getClientHistory(clientId);
    return { client, history };
}

async function exportClientToPdf() {
    const modalEl = document.getElementById('clientDetailsModal');
    const clientId = parseInt(modalEl.dataset.clientId);
    if (isNaN(clientId)) { alert("ID cliente no obtenido."); return; }
    try {
        const { client, history } = await getClientDataForExport(clientId);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text(`Reporte Cliente: ${client.nombre || 'N/A'}`, 14, 20);
        doc.setFontSize(11); doc.setTextColor(100);
        let yPos = 30; const lh = 7, sSpace = 5;
        doc.setFontSize(14); doc.text("Info Cliente", 14, yPos); yPos += lh; doc.setFontSize(10);
        doc.text(`ID: ${client.id}`, 14, yPos); yPos += lh; doc.text(`Nombre: ${client.nombre || 'N/A'}`, 14, yPos); yPos += lh; doc.text(`Correo: ${client.correo || 'N/A'}`, 14, yPos); yPos += sSpace; yPos += lh;
        doc.setFontSize(14); doc.text("Info Vehículo", 14, yPos); yPos += lh; doc.setFontSize(10);
        doc.text(`Placa: ${client.placa || 'N/A'}`, 14, yPos); yPos += lh; doc.text(`Marca: ${client.marca_carro || 'N/A'}`, 14, yPos); yPos += lh; doc.text(`Modelo: ${client.modelo_carro || 'N/A'}`, 14, yPos); yPos += lh; doc.text(`Año: ${client.anio_carro || 'N/A'}`, 14, yPos); yPos += lh; doc.text(`Km: ${client.kilometraje ? client.kilometraje.toLocaleString() + ' km' : 'N/A'}`, 14, yPos); yPos += lh; doc.text(`Motivo Visita: ${client.revision || 'N/A'}`, 14, yPos); yPos += lh; doc.text(`SOAT: ${client.soat ? new Date(client.soat).toLocaleDateString() : 'No reg.'}`, 14, yPos); yPos += lh; doc.text(`Rev. Técnica: ${client.revision_tecnica ? new Date(client.revision_tecnica).toLocaleDateString() : 'No reg.'}`, 14, yPos); yPos += sSpace; yPos += lh;
        doc.setFontSize(14); doc.text("Historial Mantenimientos", 14, yPos); yPos += lh / 2;
        if (history.length > 0) {
            const cols = ["Fecha", "Tipo", "Km", "Costo ($)", "Estado", "Mecánico"]; const rows = [];
            history.forEach(v => { const vData = [new Date(v.fecha).toLocaleDateString(), v.tipo || 'N/A', v.kilometraje ? v.kilometraje.toLocaleString() + ' km' : 'N/A', v.costo ? v.costo.toFixed(2) : 'N/A', v.estado || 'Completado', v.mecanicoUsuario || 'N/A']; rows.push(vData); });
            doc.autoTable({ head: [cols], body: rows, startY: yPos, theme: 'striped', headStyles: { fillColor: [22, 160, 133] }, styles: { fontSize: 8, cellPadding: 1.5 }, columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 30 }, 3: { halign: 'right' } } });
        } else { doc.setFontSize(10); doc.text("No hay historial.", 14, yPos + lh); }
        const fName = `Reporte_Cliente_${client.nombre ? client.nombre.replace(/\s+/g, '_') : client.id}.pdf`;
        doc.save(fName); alert(`PDF "${fName}" generado.`);
    } catch (err) { console.error("Error PDF cliente:", err); alert("Error PDF: " + err.message); }
}

async function exportClientToCsv() {
    const modalEl = document.getElementById('clientDetailsModal');
    const clientId = parseInt(modalEl.dataset.clientId);
    if (isNaN(clientId)) { alert("ID cliente no obtenido."); return; }
    try {
        const { client, history } = await getClientDataForExport(clientId);
        let csvContent = "Informacion del Cliente\r\n";
        csvContent += `ID,"${client.id}"\r\nNombre,"${client.nombre || ''}"\r\nCorreo,"${client.correo || ''}"\r\n\r\nInformacion del Vehiculo\r\n`;
        csvContent += `Placa,"${client.placa || ''}"\r\nMarca,"${client.marca_carro || ''}"\r\nModelo,"${client.modelo_carro || ''}"\r\nAño,"${client.anio_carro || ''}"\r\nKilometraje Actual,"${client.kilometraje !== undefined ? client.kilometraje : ''}"\r\nMotivo Visita Inicial,"${client.revision || ''}"\r\nVencimiento SOAT,"${client.soat ? new Date(client.soat).toLocaleDateString() : ''}"\r\nVencimiento Rev. Técnica,"${client.revision_tecnica ? new Date(client.revision_tecnica).toLocaleDateString() : ''}"\r\n\r\nHistorial de Mantenimientos\r\n`;
        if (history.length > 0) {
            const histCsv = history.map(v => ({ Fecha: new Date(v.fecha).toLocaleDateString(), Tipo: v.tipo || '', Kilometraje: v.kilometraje !== undefined ? v.kilometraje : '', Costo: v.costo !== undefined ? v.costo.toFixed(2) : '', Estado: v.estado || 'Completado', Mecanico: v.mecanicoUsuario || '' }));
            csvContent += Papa.unparse(histCsv, { header: true });
        } else { csvContent += "No hay historial.\r\n"; }
        const fName = `Reporte_Cliente_${client.nombre ? client.nombre.replace(/\s+/g, '_') : client.id}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", fName);
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
        alert(`CSV "${fName}" generado.`);
    } catch (err) { console.error("Error CSV cliente:", err); alert("Error CSV: " + err.message); }
}


// Exportación General
async function exportGeneralReportToPdf(reportData, fileName, includeGraphics) {
    if (!reportData) { alert("No hay datos para generar el PDF."); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    let yPos = 20; const margin = 15; const pageWidth = doc.internal.pageSize.getWidth(); const lineHeight = 7; const sectionSpacing = 10;
    doc.setFontSize(18); doc.text("Reporte General de Mantenimientos", pageWidth / 2, yPos, { align: 'center' }); yPos += sectionSpacing;
    if (reportData.summary) {
        doc.setFontSize(14); doc.text("Resumen del Reporte", margin, yPos); yPos += lineHeight; doc.setFontSize(10); doc.setTextColor(80);
        const summaryItems = [{ label: "Fecha del Informe:", value: reportData.summary.fechaInforme },{ label: "Total Mantenimientos:", value: reportData.summary.totalMantenimientos },{ label: "Costo Total:", value: `$${(reportData.summary.costoTotal || 0).toFixed(2)}` },{ label: "Costo Promedio:", value: `$${(reportData.summary.costoPromedio || 0).toFixed(2)}` },{ label: "Mantenimientos Preventivos:", value: reportData.summary.preventivos },{ label: "Mantenimientos Correctivos:", value: reportData.summary.correctivos },];
        summaryItems.forEach(item => { if (yPos > doc.internal.pageSize.getHeight() - margin - lineHeight) { doc.addPage(); yPos = margin; } doc.setFont(undefined, 'bold'); doc.text(item.label, margin, yPos); doc.setFont(undefined, 'normal'); doc.text(String(item.value), margin + 50, yPos); yPos += lineHeight; });
        yPos += sectionSpacing / 2; doc.setTextColor(0);
    }
    if (includeGraphics && reportData.summary && reportData.summary.totalMantenimientos > 0) {
        doc.setFontSize(14); doc.text("Distribución de Tipos de Mantenimiento", margin, yPos); yPos += lineHeight;
        const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 200; const ctx = canvas.getContext('2d');
        if (window.tempReportChart) window.tempReportChart.destroy();
        window.tempReportChart = new Chart(ctx, { type: 'pie', data: { labels: ['Preventivos', 'Correctivos'], datasets: [{ data: [reportData.summary.preventivos, reportData.summary.correctivos], backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)'], borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'], borderWidth: 1 }] }, options: { responsive: false, animation: { duration: 0 }, plugins: { legend: { position: 'top' }, title: { display: false } } } });
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
            const imgData = canvas.toDataURL('image/png'); const imgWidth = 80; const imgHeight = (canvas.height * imgWidth) / canvas.width;
            if (yPos + imgHeight > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); yPos = margin; }
            doc.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, yPos, imgWidth, imgHeight); yPos += imgHeight + sectionSpacing;
        } catch (e) { console.error("Error al añadir gráfico al PDF:", e); doc.setFontSize(10); doc.setTextColor(255, 0, 0); doc.text("Error al generar el gráfico.", margin, yPos); yPos += lineHeight; doc.setTextColor(0); }
        if (window.tempReportChart) window.tempReportChart.destroy();
    }
    if (reportData.details && reportData.details.length > 0) {
        if (yPos > doc.internal.pageSize.getHeight() - margin - 20) { doc.addPage(); yPos = margin; }
        doc.setFontSize(14); doc.text("Detalles de Mantenimientos", margin, yPos); yPos += lineHeight / 2;
        const tableColumn = Object.keys(reportData.details[0]); const tableRows = reportData.details.map(item => Object.values(item).map(val => String(val === null || val === undefined ? 'N/A' : val)));
        doc.autoTable({ head: [tableColumn], body: tableRows, startY: yPos, theme: 'grid', headStyles: { fillColor: [41, 128, 185], textColor: 255 }, styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' }, didDrawPage: function (data) { yPos = data.cursor.y + sectionSpacing / 2; } });
    } else { if (yPos > doc.internal.pageSize.getHeight() - margin - lineHeight) { doc.addPage(); yPos = margin; } doc.setFontSize(10); doc.text("No hay detalles disponibles para este reporte.", margin, yPos); }
    const pageCount = doc.internal.getNumberOfPages(); for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 10, doc.internal.pageSize.getHeight() - 10, { align: 'right' }); }
    doc.save(`${fileName}.pdf`); alert(`PDF "${fileName}.pdf" generado.`);
}

function exportAdvancedReport() {
    const format = document.getElementById('exportFormat').value;
    const includeGraphics = document.getElementById('includeGraphics').value === 'yes';
    const detailLevel = document.getElementById('detailLevel').value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `reporte_mantenimiento_${detailLevel}_${timestamp}`;
    document.getElementById('includeGraphics').disabled = (format !== 'pdf');

    getMaintenanceDataForAllTime().then(data => {
        if (data.length === 0) { alert("No hay datos de mantenimiento para exportar."); return; }
        const reportData = prepareReportData(data, detailLevel);
        switch (format) {
            case 'pdf': exportGeneralReportToPdf(reportData, fileName, includeGraphics); break;
            case 'excel': exportToCsvGeneral(reportData, fileName); alert("El reporte de Excel se descargará como CSV."); break;
            case 'csv': exportToCsvGeneral(reportData, fileName); break;
            case 'json': exportToJson(reportData, fileName); break;
            default: alert("Formato no válido.");
        }
    }).catch(error => { console.error('Error exportando:', error); alert('Error al generar reporte.'); });
}

function prepareReportData(data, detailLevel) {
    const calcStats = arr => {
        if (arr.length === 0) return { totalMantenimientos: 0, costoTotal: 0, costoPromedio: 0, preventivos: 0, correctivos: 0, fechaInforme: new Date().toLocaleString() };
        const costs = arr.map(item => item.costo || 0);
        const costTotal = costs.reduce((sum, cost) => sum + cost, 0);
        return { totalMantenimientos: arr.length, costoTotal, costoPromedio: arr.length > 0 ? costTotal / arr.length : 0, preventivos: arr.filter(item => item.tipo === 'preventivo').length, correctivos: arr.filter(item => item.tipo === 'correctivo').length, fechaInforme: new Date().toLocaleString() };
    };
    const summaryData = calcStats(data);
    switch (detailLevel) {
        case 'summary': return { summary: summaryData, details: null };
        case 'detailed':
            return { summary: summaryData, details: data.map(item => ({ Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A', Kilometraje: item.kilometraje, Costo: item.costo !== undefined ? item.costo.toFixed(2) : 'N/A', Tipo: item.tipo, Mecanico: item.mecanicoUsuario })) };
        case 'complete': default:
            return { summary: summaryData, details: data.map(item => ({ ID: item.id, FechaISO: item.fecha ? new Date(item.fecha).toISOString() : 'N/A', Kilometraje: item.kilometraje, Costo: item.costo, Tipo: item.tipo, Estado: item.estado, MecanicoID: item.mecanicoId, MecanicoUsuario: item.mecanicoUsuario, ClienteID: item.clienteId })) };
    }
}

function exportToCsvGeneral(data, fileName) {
    if (!data || (!data.summary && (!data.details || data.details.length === 0))) { alert("No hay datos para CSV."); return; }
    let csvContent = "";
    if (data.summary) {
        csvContent += "Resumen Reporte Mantenimientos\r\n";
        Object.entries(data.summary).forEach(([key, value]) => csvContent += `"${key.replace(/_/g, ' ')}","${value}"\r\n`);
        csvContent += "\r\n";
    }
    if (data.details && data.details.length > 0) {
        csvContent += Papa.unparse(data.details, { header: true, quotes: true });
    } else if (!data.summary) { alert("No hay detalles para CSV."); return; }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${fileName}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
}

function exportToJson(data, fileName) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${fileName}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
}

// Órdenes de Servicio (NUEVO)
function getServiceOrders() {
    return new Promise((resolve, reject) => {
        if (!db) { reject("BD no lista."); return; }
        const transaction = db.transaction(['serviceOrders'], 'readonly');
        const store = transaction.objectStore('serviceOrders');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a,b) => new Date(b.entryDate) - new Date(a.entryDate)));
        request.onerror = (e) => reject('Error obteniendo órdenes: ' + e.target.error.message);
    });
}

function addServiceOrder(orderData) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("BD no lista."); return; }
        const transaction = db.transaction(['serviceOrders'], 'readwrite');
        const store = transaction.objectStore('serviceOrders');
        const request = store.add(orderData);
        request.onsuccess = () => {
            updateServiceOrdersTable();
            if (orderData.status === 'Completado' && orderData.totalCost > 0) {
                addMaintenanceData({
                    clienteId: orderData.clienteId,
                    kilometraje: orderData.vehicleMileage || 0,
                    costo: orderData.totalCost,
                    tipo: 'Servicio Taller',
                }).catch(err => console.error("Error al agregar a historial desde orden:", err));
            }
            resolve(request.result);
        };
        request.onerror = (e) => reject('Error agregando orden: ' + e.target.error.message);
    });
}

function updateServiceOrder(orderData) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("BD no lista."); return; }
        const transaction = db.transaction(['serviceOrders'], 'readwrite');
        const store = transaction.objectStore('serviceOrders');
        const request = store.put(orderData);
        request.onsuccess = () => {
            updateServiceOrdersTable();
             if (orderData.status === 'Completado' && orderData.totalCost > 0) {
                addMaintenanceData({
                    clienteId: orderData.clienteId,
                    kilometraje: orderData.vehicleMileage || 0,
                    costo: orderData.totalCost,
                    tipo: 'Servicio Taller',
                }).catch(err => console.error("Error al agregar a historial desde orden (update):", err));
            }
            resolve(request.result);
        };
        request.onerror = (e) => reject('Error actualizando orden: ' + e.target.error.message);
    });
}

function deleteServiceOrder(orderId) {
    if (!confirm(`¿Seguro que desea eliminar la orden de servicio ID ${orderId}?`)) return;
    return new Promise((resolve, reject) => {
        if (!db) { reject("BD no lista."); return; }
        const transaction = db.transaction(['serviceOrders'], 'readwrite');
        const store = transaction.objectStore('serviceOrders');
        const request = store.delete(orderId);
        request.onsuccess = () => {
            updateServiceOrdersTable();
            resolve();
        };
        request.onerror = (e) => reject('Error eliminando orden: ' + e.target.error.message);
    });
}

function updateServiceOrdersTable() {
    getServiceOrders().then(orders => {
        const tbody = document.getElementById('serviceOrdersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">No hay órdenes de servicio registradas.</td></tr>';
            return;
        }
        orders.forEach(order => {
            const tr = document.createElement('tr');
            const statusBadge = getStatusBadge(order.status);
            tr.innerHTML = `
                <td>${order.id}</td>
                <td>${order.clientName || 'N/A'} (ID: ${order.clienteId})</td>
                <td>${order.vehicleInfo || 'N/A'}</td>
                <td>${new Date(order.entryDate).toLocaleDateString()}</td>
                <td>${order.mechanicName || 'No asignado'}</td>
                <td><span class="badge ${statusBadge.class}">${statusBadge.text}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="prepareServiceOrderModal(${order.id})" title="Editar/Ver Orden">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    ${currentUser.isAdmin ? `<button class="btn btn-sm btn-danger ms-1" onclick="deleteServiceOrder(${order.id})" title="Eliminar Orden">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(err => {
        const tbody = document.getElementById('serviceOrdersTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4">Error al cargar órdenes: ${err}</td></tr>`;
    });
}

function getStatusBadge(status) {
    switch (status) {
        case 'Pendiente': return { class: 'bg-secondary', text: 'Pendiente' };
        case 'En Progreso': return { class: 'bg-primary', text: 'En Progreso' };
        case 'Esperando Piezas': return { class: 'bg-warning text-dark', text: 'Esperando Piezas' };
        case 'Listo para Entrega': return { class: 'bg-info text-dark', text: 'Listo p/ Entrega' };
        case 'Completado': return { class: 'bg-success', text: 'Completado' };
        case 'Facturado': return { class: 'bg-dark', text: 'Facturado' };
        case 'Cancelado': return { class: 'bg-danger', text: 'Cancelado' };
        default: return { class: 'bg-light text-dark', text: status };
    }
}

function prepareServiceOrderModal(orderId = null) {
    const modalEl = document.getElementById('serviceOrderModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const form = document.getElementById('serviceOrderForm');
    form.reset();
    document.getElementById('editServiceOrderId').value = '';
    document.getElementById('serviceOrderModalLabel').textContent = "Nueva Orden de Servicio";
    document.getElementById('serviceOrderItemsContainer').innerHTML = '';
    addServiceOrderItem();

    const clientSelect = document.getElementById('soClient');
    clientSelect.innerHTML = '<option value="">Cargando clientes...</option>';
    getClients().then(clients => {
        clientSelect.innerHTML = '<option value="" selected disabled>Seleccione un cliente...</option>';
        clients.sort((a,b) => (a.nombre || "").localeCompare(b.nombre || "")).forEach(c => {
            clientSelect.add(new Option(`${c.nombre} (Placa: ${c.placa || 'N/A'})`, c.id));
        });
        if (orderId) loadServiceOrderForEditing(orderId);
    }).catch(err => clientSelect.innerHTML = '<option value="">Error al cargar clientes</option>');

    const mechanicSelect = document.getElementById('soMechanic');
    mechanicSelect.innerHTML = '<option value="">Cargando mecánicos...</option>';
    getMechanics().then(mechanics => {
        mechanicSelect.innerHTML = '<option value="" selected disabled>Seleccione mecánico...</option>';
        mechanics.forEach(m => {
            mechanicSelect.add(new Option(m.usuario, m.id));
        });
        if (orderId && !clientSelect.value) loadServiceOrderForEditing(orderId);
    }).catch(err => mechanicSelect.innerHTML = '<option value="">Error al cargar mecánicos</option>');

    document.getElementById('soEntryDate').value = new Date().toISOString().split('T')[0];
    modal.show();
}

function loadServiceOrderForEditing(orderId) {
    document.getElementById('serviceOrderModalLabel').textContent = `Editar Orden de Servicio #${orderId}`;
    document.getElementById('editServiceOrderId').value = orderId;

    if (!db) { alert("BD no lista."); return; }
    const transaction = db.transaction(['serviceOrders'], 'readonly');
    const store = transaction.objectStore('serviceOrders');
    const request = store.get(orderId);

    request.onsuccess = (event) => {
        const order = event.target.result;
        if (order) {
            document.getElementById('soClient').value = order.clienteId;
            updateVehicleInfoForServiceOrder(order.clienteId, order.vehicleInfo);
            document.getElementById('soEntryDate').value = order.entryDate ? order.entryDate.split('T')[0] : '';
            document.getElementById('soMechanic').value = order.mechanicId || '';
            document.getElementById('soStatus').value = order.status;
            document.getElementById('soProblemDescription').value = order.problemDescription || '';
            document.getElementById('soNotes').value = order.notes || '';
            
            const itemsContainer = document.getElementById('serviceOrderItemsContainer');
            itemsContainer.innerHTML = '';
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => addServiceOrderItem(item));
            } else {
                 addServiceOrderItem();
            }
            calculateServiceOrderTotal();
        } else {
            alert("Orden no encontrada.");
            bootstrap.Modal.getInstance(document.getElementById('serviceOrderModal'))?.hide();
        }
    };
    request.onerror = (e) => alert("Error cargando orden: " + e.target.error.message);
}

function updateVehicleInfoForServiceOrder(clientId, prefillText = null) {
    const vehicleInfoInput = document.getElementById('soVehicleInfo');
    if (prefillText) { vehicleInfoInput.value = prefillText; return; }
    if (!clientId) { vehicleInfoInput.value = 'Seleccione un cliente para ver vehículo'; return; }
    if (!db) { vehicleInfoInput.value = 'BD no lista.'; return; }
    const tx = db.transaction(['clientes'], 'readonly');
    const store = tx.objectStore('clientes');
    const request = store.get(parseInt(clientId));
    request.onsuccess = (event) => {
        const client = event.target.result;
        if (client) { vehicleInfoInput.value = `${client.marca_carro || '?'} ${client.modelo_carro || '?'} (${client.anio_carro || '?'}) - Placa: ${client.placa || 'N/A'}`; }
        else { vehicleInfoInput.value = 'Cliente no encontrado.'; }
    };
    request.onerror = () => vehicleInfoInput.value = 'Error al cargar vehículo.';
}

function addServiceOrderItem(item = null) {
    const container = document.getElementById('serviceOrderItemsContainer');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'service-order-item row gx-2 mb-2 align-items-center';
    itemDiv.innerHTML = `
        <div class="col-md-5"><input type="text" class="form-control form-control-sm so-item-description" placeholder="Descripción servicio/pieza" value="${item?.description || ''}"></div>
        <div class="col-md-2"><input type="number" class="form-control form-control-sm so-item-quantity" placeholder="Cant." value="${item?.quantity || 1}" min="0.1" step="0.1" oninput="calculateServiceOrderItemTotal(this)"></div>
        <div class="col-md-2"><input type="number" class="form-control form-control-sm so-item-price" placeholder="Precio U." value="${item?.price || ''}" min="0" step="0.01" oninput="calculateServiceOrderItemTotal(this)"></div>
        <div class="col-md-2"><input type="text" class="form-control form-control-sm so-item-total bg-light" placeholder="Total" value="${item?.total ? item.total.toFixed(2) : '0.00'}" readonly></div>
        <div class="col-md-1"><button type="button" class="btn btn-sm btn-danger w-100" onclick="removeServiceOrderItem(this)" title="Eliminar ítem"><i class="fas fa-trash"></i></button></div>`;
    container.appendChild(itemDiv);
    if(item) calculateServiceOrderItemTotal(itemDiv.querySelector('.so-item-quantity'));
}

function removeServiceOrderItem(button) {
    button.closest('.service-order-item').remove();
    calculateServiceOrderTotal();
}

function calculateServiceOrderItemTotal(inputElement) {
    const itemRow = inputElement.closest('.service-order-item');
    const quantity = parseFloat(itemRow.querySelector('.so-item-quantity').value) || 0;
    const price = parseFloat(itemRow.querySelector('.so-item-price').value) || 0;
    const totalInput = itemRow.querySelector('.so-item-total');
    totalInput.value = (quantity * price).toFixed(2);
    calculateServiceOrderTotal();
}

function calculateServiceOrderTotal() {
    let grandTotal = 0;
    document.querySelectorAll('#serviceOrderItemsContainer .service-order-item').forEach(itemRow => {
        const itemTotal = parseFloat(itemRow.querySelector('.so-item-total').value) || 0;
        grandTotal += itemTotal;
    });
    document.getElementById('soTotalCost').value = grandTotal.toFixed(2);
}

// Dashboard Data Loading
function loadDashboardData() {
    getServiceOrders().then(orders => {
        const activeOrders = orders.filter(o => o.status !== 'Completado' && o.status !== 'Facturado' && o.status !== 'Cancelado');
        document.getElementById('activeOrdersCount').textContent = activeOrders.length;
    }).catch(err => document.getElementById('activeOrdersCount').textContent = 'E');

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    getAppointments(todayStart, todayEnd).then(appointments => {
        document.getElementById('todayAppointmentsCount').textContent = appointments.length;
        const upcomingBody = document.getElementById('upcomingAppointmentsTable');
        upcomingBody.innerHTML = '';
        if(appointments.length === 0) {
            upcomingBody.innerHTML = '<tr><td colspan="5" class="text-center p-3">No hay citas para hoy.</td></tr>';
        } else {
            appointments.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).slice(0, 5).forEach(app => {
                const tr = upcomingBody.insertRow();
                const statusBadge = getStatusBadge(app.status);
                let vehicleDisplayInfo = 'N/A'; // Default
                // Asynchronously fetch client info for vehicle display if needed (or pre-join if data structure changes)
                // This is a simplified version for dashboard, full vehicle info is complex here.
                if (app.clienteId) {
                     // For dashboard, just show client name and service. Vehicle info is too much for quick load.
                }

                tr.innerHTML = `
                    <td>${new Date(app.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td>${app.clientName}</td>
                    <td>${app.vehicleInfo || 'Vehículo no especificado'}</td> 
                    <td>${app.service}</td>
                    <td><span class="badge ${statusBadge.class}">${statusBadge.text}</span></td>
                `;
            });
        }
    }).catch(err => document.getElementById('todayAppointmentsCount').textContent = 'E');

    getInventoryItems().then(items => {
        const lowStock = items.filter(item => item.stock <= item.minStock);
        document.getElementById('lowStockItemsCount').textContent = lowStock.length;
    }).catch(err => document.getElementById('lowStockItemsCount').textContent = 'E');
}


// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initDB()
        .then(() => {
            console.log('Base de datos lista.'); createDefaultMechanic(); showLoginScreen();

            document.getElementById('loginForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = document.getElementById('username').value, p = document.getElementById('password').value;
                login(u, p).then(() => { showMainScreen(); document.getElementById('password').value = ''; })
                           .catch(err => { alert('Login fallido: ' + err); document.getElementById('password').value = ''; });
            });
            document.getElementById('logoutBtn')?.addEventListener('click', () => { currentUser = null; showLoginScreen(); });

            const dmSwitch = document.getElementById('darkModeSwitch');
            if(dmSwitch) {
                const savedMode = localStorage.getItem('darkMode');
                if (savedMode === 'enabled') { document.body.classList.add('dark-mode'); dmSwitch.checked = true; }
                dmSwitch.addEventListener('change', (e_event) => { // Renamed
                    document.body.classList.toggle('dark-mode', e_event.target.checked);
                    localStorage.setItem('darkMode', e_event.target.checked ? 'enabled' : 'disabled');
                });
            }

            document.getElementById('clientForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const client = {
                    nombre: document.getElementById('clientName').value, correo: document.getElementById('clientEmail').value,
                    placa: document.getElementById('clientPlate').value.toUpperCase(), marca_carro: document.getElementById('carMake').value,
                    modelo_carro: document.getElementById('carModel').value, anio_carro: document.getElementById('carYear').value,
                    kilometraje: parseInt(document.getElementById('carMileage').value) || 0,
                    soat: document.getElementById('carSoat').value || null, revision_tecnica: document.getElementById('carTechReview').value || null,
                    revision: document.getElementById('revisionType').value
                };
                if (!client.nombre || !client.placa || !client.marca_carro || !client.modelo_carro) { alert("Campos obligatorios: Nombre, Placa, Marca, Modelo."); return; }
                addClient(client).then(() => { e.target.reset(); updateClientsTable(); alert('Cliente agregado.'); bootstrap.Modal.getInstance(document.getElementById('addClientModal'))?.hide(); })
                                 .catch(err => alert('Error: ' + err));
            });

            document.getElementById('mechanicForm')?.addEventListener('submit', (e) => {
                e.preventDefault(); if (!currentUser?.isAdmin) return;
                const mech = { usuario: document.getElementById('mechanicUsername').value, contraseña: document.getElementById('mechanicPassword').value };
                if (!mech.usuario || !mech.contraseña) { alert("Usuario y contraseña requeridos."); return; }
                addMechanic(mech).then(() => { e.target.reset(); updateMechanicsTable(); alert('Mecánico agregado.'); bootstrap.Modal.getInstance(document.getElementById('addMechanicModal'))?.hide(); })
                                 .catch(err => alert('Error: ' + err));
            });

            document.querySelectorAll('.sidebar .nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault(); const tabId = e.currentTarget.dataset.tab; if (!tabId) return;
                    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    document.querySelectorAll('.tab-content').forEach(c => c.id === `${tabId}Tab` ? c.classList.remove('d-none') : c.classList.add('d-none'));
                    switch(tabId) {
                        case 'dashboard': loadDashboardData(); break;
                        case 'services': updateServiceOrdersTable(); break;
                        case 'clients': updateClientsTable(); break;
                        case 'appointments': updateCalendar(); break;
                        case 'inventory': updateInventoryTable(); break;
                        case 'mechanics': if (currentUser?.isAdmin) updateMechanicsTable(); break;
                        case 'analytics': if (currentUser?.isAdmin) generateAnalysis(); break;
                        case 'reports': if (currentUser?.isAdmin) document.getElementById('reportContent').innerHTML = '<p class="text-muted text-center mt-3">Seleccione opciones y genere un reporte.</p>'; break;
                    }
                });
            });

            document.getElementById('maintenanceDataForm')?.addEventListener('submit', (e) => {
                e.preventDefault(); if (!currentUser?.isAdmin) return;
                const data = {
                    kilometraje: parseFloat(document.getElementById('mileage').value),
                    costo: parseFloat(document.getElementById('maintenanceCost').value),
                    tipo: document.getElementById('maintenanceType').value
                };
                if (isNaN(data.kilometraje) || isNaN(data.costo)) { alert("Kilometraje y Costo deben ser números."); return; }
                addMaintenanceData(data).then(() => { e.target.reset(); generateAnalysis(); alert('Dato agregado.'); })
                                        .catch(err => alert('Error: ' + err));
            });

            document.getElementById('appointmentForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const clientSel = document.getElementById('appointmentClient');
                const clientId = clientSel.value;
                const clientName = clientSel.options[clientSel.selectedIndex]?.text.split(' (')[0] || 'Cliente Desconocido';
                const date = document.getElementById('appointmentDate').value;
                const time = document.getElementById('appointmentTime').value;
                const service = document.getElementById('appointmentService').value;
                const notes = document.getElementById('appointmentNotes').value;
                if (!clientId || !date || !time || !service) { alert("Complete campos requeridos."); return; }
                const appDateTime = new Date(`${date}T${time}`);
                if (isNaN(appDateTime.getTime())) { alert("Fecha/Hora inválida."); return; }
                const app = { clienteId: parseInt(clientId), clientName, fecha: appDateTime.toISOString(), service, notes };
                addAppointment(app).then(() => { bootstrap.Modal.getInstance(document.getElementById('appointmentModal'))?.hide(); e.target.reset(); alert('Cita agendada.'); })
                                   .catch(err => alert('Error: ' + err));
            });

            document.getElementById('serviceOrderForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const orderId = document.getElementById('editServiceOrderId').value;
                const clientSelect = document.getElementById('soClient');
                const mechanicSelect = document.getElementById('soMechanic');

                const orderData = {
                    clienteId: parseInt(clientSelect.value),
                    clientName: clientSelect.options[clientSelect.selectedIndex]?.text.split(' (')[0] || 'N/A',
                    vehicleInfo: document.getElementById('soVehicleInfo').value,
                    entryDate: new Date(document.getElementById('soEntryDate').value).toISOString(),
                    mechanicId: mechanicSelect.value ? parseInt(mechanicSelect.value) : null,
                    mechanicName: mechanicSelect.value ? mechanicSelect.options[mechanicSelect.selectedIndex]?.text : 'No asignado',
                    status: document.getElementById('soStatus').value,
                    problemDescription: document.getElementById('soProblemDescription').value,
                    notes: document.getElementById('soNotes').value,
                    items: [],
                    totalCost: parseFloat(document.getElementById('soTotalCost').value) || 0,
                    vehicleMileage: 0 
                };
                 
                if (orderData.clienteId) {
                    const clientTx = db.transaction(['clientes'], 'readonly');
                    const clientStore = clientTx.objectStore('clientes');
                    const clientReq = clientStore.get(orderData.clienteId);
                    clientReq.onsuccess = (ev) => {
                        const client = ev.target.result;
                        if (client && client.kilometraje) {
                            orderData.vehicleMileage = client.kilometraje;
                        }
                        saveFinalOrder(orderId, orderData);
                    };
                    clientReq.onerror = () => {
                        console.warn("Could not fetch client for mileage on service order.");
                        saveFinalOrder(orderId, orderData); 
                    }
                } else {
                     saveFinalOrder(orderId, orderData);
                }
            });

            function saveFinalOrder(orderId, orderData){
                 document.querySelectorAll('#serviceOrderItemsContainer .service-order-item').forEach(row => {
                    const description = row.querySelector('.so-item-description').value;
                    const quantity = parseFloat(row.querySelector('.so-item-quantity').value);
                    const price = parseFloat(row.querySelector('.so-item-price').value);
                    if (description && !isNaN(quantity) && !isNaN(price)) {
                        orderData.items.push({ description, quantity, price, total: quantity * price });
                    }
                });

                if (!orderData.clienteId || !orderData.entryDate || !orderData.status) {
                    alert("Cliente, Fecha de Ingreso y Estado son obligatorios."); return;
                }

                const promise = orderId ? updateServiceOrder({ ...orderData, id: parseInt(orderId) }) : addServiceOrder(orderData);
                promise.then(() => {
                    bootstrap.Modal.getInstance(document.getElementById('serviceOrderModal'))?.hide();
                    alert(`Orden ${orderId ? 'actualizada' : 'creada'} correctamente.`);
                }).catch(err => alert('Error guardando orden: ' + err));
            }


            const calMonthInput = document.getElementById('calendarMonth');
            if (calMonthInput) {
                const today = new Date();
                calMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                calMonthInput.addEventListener('change', updateCalendar);
            }

            const reportMonthInput = document.getElementById('reportMonth');
            if (reportMonthInput) {
                 const today = new Date();
                reportMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            }

            document.getElementById('vehicleSearchBtn')?.addEventListener('click', searchVehicle);
            document.getElementById('vehicleSearch')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchVehicle(); });

        })
        .catch(error => {
            console.error('Error fatal al inicializar la aplicación:', error);
            document.body.innerHTML = `<div class="alert alert-danger m-5">Error crítico al iniciar la base de datos. Verifique la consola y recargue. Detalles: ${error.message || error}</div>`;
        });
});