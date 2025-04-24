function saveMechanic(e) {
    e.preventDefault();
    
    const mechanicForm = document.getElementById('mechanic-form');
    const mechanicId = mechanicForm.dataset.mechanicId;
    
    const newMechanic = {
        name: document.getElementById('mechanic-name').value,
        username: document.getElementById('mechanic-username').value,
        password: document.getElementById('mechanic-password').value,
        assignedVehicle: document.getElementById('assigned-vehicle').value !== "none" 
            ? document.getElementById('assigned-vehicle').value 
            : null,
        status: "available"
    };
    
    // Guardar el mecánico
    const mechanics = JSON.parse(localStorage.getItem('mechanics')) || [];
    
    if (mechanicId) {
        // Actualizar mecánico existente
        const index = mechanics.findIndex(m => m.id === parseInt(mechanicId));
        if (index !== -1) {
            // Mantener ID y status actual si está ocupado
            newMechanic.id = mechanics[index].id;
            if (mechanics[index].status === 'busy') {
                newMechanic.status = 'busy';
            }
            mechanics[index] = newMechanic;
        }
    } else {
        // Agregar nuevo mecánico
        newMechanic.id = mechanics.length > 0 ? Math.max(...mechanics.map(m => m.id)) + 1 : 1;
        mechanics.push(newMechanic);
    }
    
    localStorage.setItem('mechanics', JSON.stringify(mechanics));
    
    // Cerrar modal y actualizar tabla
    closeAllModals();
    loadMechanics();
    
    // Limpiar formulario
    mechanicForm.reset();
    delete mechanicForm.dataset.mechanicId;
}

// Funciones para calendario y citas
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    if (calendar) {
        calendar.destroy();
    }
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'es',
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día'
        },
        events: loadCalendarEvents(),
        eventClick: function(info) {
            viewAppointment(info.event.id);
        },
        dateClick: function(info) {
            showAppointmentModal(info.dateStr);
        }
    });
    
    calendar.render();
    
    // Botón para agregar cita
    document.getElementById('add-appointment-btn').addEventListener('click', () => {
        const today = new Date();
        showAppointmentModal(formatDate(today));
    });
}

function loadCalendarEvents() {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const clients = JSON.parse(localStorage.getItem('clients')) || [];
    
    return appointments.map(app => {
        const client = clients.find(c => c.id === app.clientId);
        
        const serviceColors = {
            oil_change: '#6bc3ff',
            major_service: '#001e50',
            minor_service: '#2773b2',
            brake_service: '#343a40',
            suspension: '#6c757d'
        };
        
        const serviceNames = {
            oil_change: 'Cambio de Aceite',
            major_service: 'Servicio Mayor',
            minor_service: 'Servicio Menor',
            brake_service: 'Servicio de Frenos',
            suspension: 'Revisión de Suspensión'
        };
        
        return {
            id: app.id.toString(),
            title: client ? `${client.name} - ${serviceNames[app.service]}` : serviceNames[app.service],
            start: `${app.date}T${app.time}`,
            backgroundColor: serviceColors[app.service] || '#2773b2',
            borderColor: serviceColors[app.service] || '#2773b2'
        };
    });
}

function showAppointmentModal(date = null) {
    document.getElementById('appointment-modal').classList.remove('hidden');
    
    if (date) {
        document.getElementById('appointment-date').value = date;
    }
    
    // Cargar clientes y mecánicos para selector
    loadClientsForAppointment();
    loadMechanicsForAppointment();
}

function loadClientsForAppointment() {
    const clients = JSON.parse(localStorage.getItem('clients')) || [];
    const clientSelect = document.getElementById('appointment-client');
    
    // Limpiar opciones actuales
    while (clientSelect.options.length > 1) {
        clientSelect.remove(1);
    }
    
    // Agregar clientes
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} - ${client.vehicle.model}`;
        clientSelect.appendChild(option);
    });
}

function loadMechanicsForAppointment() {
    const mechanics = JSON.parse(localStorage.getItem('mechanics')) || [];
    const mechanicSelect = document.getElementById('appointment-mechanic');
    
    // Limpiar opciones actuales
    while (mechanicSelect.options.length > 1) {
        mechanicSelect.remove(1);
    }
    
    // Agregar mecánicos (excluyendo admin)
    mechanics
        .filter(m => m.status !== 'admin')
        .forEach(mechanic => {
            const option = document.createElement('option');
            option.value = mechanic.id;
            option.textContent = `${mechanic.name}`;
            mechanicSelect.appendChild(option);
        });
}

function viewAppointment(appointmentId) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const appointment = appointments.find(a => a.id.toString() === appointmentId);
    
    if (!appointment) return;
    
    const clients = JSON.parse(localStorage.getItem('clients')) || [];
    const mechanics = JSON.parse(localStorage.getItem('mechanics')) || [];
    
    const client = clients.find(c => c.id === appointment.clientId);
    const mechanic = mechanics.find(m => m.id === appointment.mechanicId);
    
    const serviceNames = {
        oil_change: 'Cambio de Aceite',
        major_service: 'Servicio Mayor',
        minor_service: 'Servicio Menor',
        brake_service: 'Servicio de Frenos',
        suspension: 'Revisión de Suspensión'
    };
    
    const formattedDate = formatDateForDisplay(appointment.date);
    
    alert(`
        Detalles de la Cita:
        
        Fecha: ${formattedDate}
        Hora: ${appointment.time}
        Servicio: ${serviceNames[appointment.service] || appointment.service}
        Cliente: ${client ? client.name : 'Desconocido'}
        Vehículo: ${client ? client.vehicle.model : 'Desconocido'}
        Mecánico asignado: ${mechanic ? mechanic.name : 'Sin asignar'}
        Notas: ${appointment.notes || 'Sin notas'}
    `);
    
    // Aquí podrías mostrar un modal detallado con opciones de editar y eliminar
}

function saveAppointment(e) {
    e.preventDefault();
    
    const appointmentForm = document.getElementById('appointment-form');
    const appointmentId = appointmentForm.dataset.appointmentId;
    
    const clientId = parseInt(document.getElementById('appointment-client').value);
    const mechanicId = parseInt(document.getElementById('appointment-mechanic').value);
    
    if (!clientId || !mechanicId) {
        alert('Por favor selecciona un cliente y un mecánico');
        return;
    }
    
    const newAppointment = {
        date: document.getElementById('appointment-date').value,
        time: document.getElementById('appointment-time').value,
        service: document.getElementById('appointment-service').value,
        clientId: clientId,
        mechanicId: mechanicId,
        notes: document.getElementById('appointment-notes').value
    };
    
    // Guardar la cita
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    
    if (appointmentId) {
        // Actualizar cita existente
        const index = appointments.findIndex(a => a.id === parseInt(appointmentId));
        if (index !== -1) {
            newAppointment.id = appointments[index].id;
            appointments[index] = newAppointment;
        }
    } else {
        // Agregar nueva cita
        newAppointment.id = appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
        appointments.push(newAppointment);
    }
    
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    // Actualizar estado del mecánico
    updateMechanicStatus(mechanicId, 'busy');
    
    // Cerrar modal y actualizar calendario
    closeAllModals();
    initializeCalendar();
    
    // Limpiar formulario
    appointmentForm.reset();
    delete appointmentForm.dataset.appointmentId;
}

function updateMechanicStatus(mechanicId, status) {
    const mechanics = JSON.parse(localStorage.getItem('mechanics')) || [];
    const index = mechanics.findIndex(m => m.id === mechanicId);
    
    if (index !== -1) {
        mechanics[index].status = status;
        localStorage.setItem('mechanics', JSON.stringify(mechanics));
    }
}

// Funciones utilitarias
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return 'Sin fecha';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Funciones para algoritmo predictivo (simulado)
function prepareDataForRPrediction(clients) {
    // En producción, aquí enviaríamos datos a R para predicción
    // Simulamos el proceso para demostración
    
    // Identificar vehículos que pronto necesitarán servicio
    const today = new Date();
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    const maintenanceAlerts = clients.filter(client => {
        const nextAppointmentDate = new Date(client.nextAppointment);
        return nextAppointmentDate <= oneMonthLater && nextAppointmentDate >= today;
    });
    
    // Mostrar alertas de mantenimiento próximo
    displayMaintenanceAlerts(maintenanceAlerts);
    
    // Simular análisis predictivo
    simulatePredictiveAnalysis(clients);
}

function displayMaintenanceAlerts(maintenanceAlerts) {
    const alertsContainer = document.getElementById('maintenance-alerts');
    alertsContainer.innerHTML = '';
    
    if (maintenanceAlerts.length === 0) {
        alertsContainer.innerHTML = '<p>No hay alertas de mantenimiento próximo.</p>';
        return;
    }
    
    maintenanceAlerts.forEach(client => {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-item';
        
        const daysUntilService = Math.ceil((new Date(client.nextAppointment) - new Date()) / (1000 * 60 * 60 * 24));
        
        alertDiv.innerHTML = `
            <div class="alert-title">${client.name} - ${client.vehicle.model}</div>
            <div class="alert-date">Servicio en ${daysUntilService} días</div>
            <button class="schedule-btn" data-id="${client.id}">Programar Cita</button>
        `;
        
        alertsContainer.appendChild(alertDiv);
    });
    
    // Agregar event listeners a botones
    document.querySelectorAll('.schedule-btn').forEach(btn => {
        btn.addEventListener('click', () => scheduleAppointmentForClient(btn.dataset.id));
    });
}

function scheduleAppointmentForClient(clientId) {
    // Mostrar modal de cita con cliente preseleccionado
    showAppointmentModal();
    
    // Seleccionar cliente en dropdown
    const clientSelect = document.getElementById('appointment-client');
    for (let i = 0; i < clientSelect.options.length; i++) {
        if (clientSelect.options[i].value === clientId) {
            clientSelect.selectedIndex = i;
            break;
        }
    }
}

function simulatePredictiveAnalysis(clients) {
    // Simulamos resultados de análisis predictivo
    // En producción, esto vendría de un análisis en R
    
    // Calcular porcentaje de vehículos con problemas por año
    const issuesByYear = {};
    const totalByYear = {};
    
    clients.forEach(client => {
        const year = client.vehicle.year;
        
        if (!issuesByYear[year]) {
            issuesByYear[year] = 0;
            totalByYear[year] = 0;
        }
        
        totalByYear[year]++;
        
        // Contar vehículos con algún problema
        if (client.vehicle.status.suspension !== 'good' || 
            client.vehicle.status.shocks !== 'good' || 
            client.vehicle.status.oil !== 'good' || 
            client.vehicle.status.coolant !== 'good') {
            issuesByYear[year]++;
        }
    });
    
    // Convertir a porcentajes para gráfico
    const labels = Object.keys(issuesByYear).sort();
    const data = labels.map(year => 
        Math.round((issuesByYear[year] / totalByYear[year]) * 100) || 0
    );
    
    // Crear gráfico de predicción
    const ctx = document.getElementById('predictive-chart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (window.predictiveChart) {
        window.predictiveChart.destroy();
    }
    
    window.predictiveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '% Problemas por Año de Fabricación',
                data: data,
                borderColor: '#001e50',
                backgroundColor: 'rgba(39, 115, 178, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje de Vehículos con Problemas'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Año de Fabricación'
                    }
                }
            }
        }
    });
}