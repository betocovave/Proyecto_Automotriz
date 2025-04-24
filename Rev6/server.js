const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const port = 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configuración de Socket.IO
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
    
    // Escuchar eventos de análisis de datos
    socket.on('request_analysis', (params) => {
        console.log('Solicitud de análisis recibida:', params);
        // Aquí se procesarían los datos y se enviaría la respuesta
        // Simulamos una respuesta después de un breve retardo
        setTimeout(() => {
            const mockData = {
                model: {
                    slope: Math.random() * 0.5 + 0.1,
                    intercept: Math.random() * 500 + 200,
                    rSquared: Math.random() * 0.5 + 0.5
                },
                prediction: Math.random() * 2000 + 1000,
                data: Array.from({length: 10}, (_, i) => ({
                    x: i * 10000 + 5000,
                    y: (i * 10000 + 5000) * (Math.random() * 0.5 + 0.1) + (Math.random() * 500 + 200) + (Math.random() * 500 - 250)
                }))
            };
            socket.emit('analysis_result', mockData);
        }, 1000);
    });
    
    // Escuchar eventos de predicción
    socket.on('predict_maintenance', (params) => {
        console.log('Solicitud de predicción recibida:', params);
        // Simular un algoritmo predictivo
        setTimeout(() => {
            const prediction = {
                nextServiceDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                estimatedCost: Math.floor(Math.random() * 5000) + 1000,
                reliability: Math.random() * 0.3 + 0.7
            };
            socket.emit('prediction_result', prediction);
        }, 1500);
    });
    
    // Escuchar eventos para comparación de talleres
    socket.on('request_workshop_data', () => {
        console.log('Solicitud de datos de talleres recibida');
        // Simular datos de talleres para la comparación
        setTimeout(() => {
            const workshopData = [
                { id: 1, name: "Taller VW Premium", brand: "Volkswagen", region: "Norte", type: "oficial", rating: 4.8, priceIndex: 85, waitTime: 2.5, partAvailability: 0.95 },
                { id: 2, name: "Servicio Rápido VW", brand: "Volkswagen", region: "Centro", type: "oficial", rating: 4.6, priceIndex: 80, waitTime: 1.8, partAvailability: 0.92 },
                { id: 3, name: "Taller Mecánico Express", brand: "Multimarca", region: "Sur", type: "independiente", rating: 4.2, priceIndex: 65, waitTime: 3.5, partAvailability: 0.75 },
                { id: 4, name: "AutoServicio Integral", brand: "Multimarca", region: "Norte", type: "independiente", rating: 4.0, priceIndex: 60, waitTime: 4.0, partAvailability: 0.7 },
                { id: 5, name: "Toyota Service Plus", brand: "Toyota", region: "Centro", type: "oficial", rating: 4.7, priceIndex: 82, waitTime: 2.2, partAvailability: 0.9 }
            ];
            socket.emit('workshop_data', workshopData);
        }, 800);
    });
    
    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API para obtener datos para el modelo predictivo
app.get('/api/maintenance-data', (req, res) => {
    // Simular datos de mantenimiento
    const maintenanceData = [];
    for (let i = 0; i < 50; i++) {
        maintenanceData.push({
            id: i + 1,
            kilometraje: Math.floor(Math.random() * 100000) + 10000,
            costo: Math.floor(Math.random() * 5000) + 500,
            tipo: Math.random() > 0.3 ? 'preventivo' : 'correctivo',
            fecha: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString()
        });
    }
    res.json(maintenanceData);
});

// API para talleres disponibles
app.get('/api/workshops', (req, res) => {
    // Simular datos de talleres
    const workshops = [
        { id: 1, name: "Taller VW Premium", brand: "Volkswagen", region: "Norte", type: "oficial", rating: 4.8, priceIndex: 85, waitTime: 2.5, partAvailability: 0.95 },
        { id: 2, name: "Servicio Rápido VW", brand: "Volkswagen", region: "Centro", type: "oficial", rating: 4.6, priceIndex: 80, waitTime: 1.8, partAvailability: 0.92 },
        { id: 3, name: "Taller Mecánico Express", brand: "Multimarca", region: "Sur", type: "independiente", rating: 4.2, priceIndex: 65, waitTime: 3.5, partAvailability: 0.75 },
        { id: 4, name: "AutoServicio Integral", brand: "Multimarca", region: "Norte", type: "independiente", rating: 4.0, priceIndex: 60, waitTime: 4.0, partAvailability: 0.7 },
        { id: 5, name: "Toyota Service Plus", brand: "Toyota", region: "Centro", type: "oficial", rating: 4.7, priceIndex: 82, waitTime: 2.2, partAvailability: 0.9 },
        { id: 6, name: "Nissan Premium Service", brand: "Nissan", region: "Norte", type: "oficial", rating: 4.5, priceIndex: 78, waitTime: 2.8, partAvailability: 0.88 },
        { id: 7, name: "Taller Mecánico Veloz", brand: "Multimarca", region: "Sur", type: "independiente", rating: 3.9, priceIndex: 55, waitTime: 4.2, partAvailability: 0.65 },
        { id: 8, name: "Chevrolet Service Center", brand: "Chevrolet", region: "Centro", type: "oficial", rating: 4.4, priceIndex: 75, waitTime: 3.0, partAvailability: 0.85 },
        { id: 9, name: "Honda Import Service", brand: "Honda", region: "Norte", type: "oficial", rating: 4.6, priceIndex: 80, waitTime: 2.5, partAvailability: 0.9 },
        { id: 10, name: "Taller Especializado Motor", brand: "Multimarca", region: "Centro", type: "independiente", rating: 4.3, priceIndex: 70, waitTime: 3.2, partAvailability: 0.78 }
    ];
    
    // Filtrar si hay parámetros de consulta
    let filteredWorkshops = [...workshops];
    
    if (req.query.brand && req.query.brand !== 'all') {
        filteredWorkshops = filteredWorkshops.filter(ws => ws.brand === req.query.brand);
    }
    
    if (req.query.region && req.query.region !== 'all') {
        filteredWorkshops = filteredWorkshops.filter(ws => ws.region === req.query.region);
    }
    
    if (req.query.type && req.query.type !== 'all') {
        filteredWorkshops = filteredWorkshops.filter(ws => ws.type === req.query.type);
    }
    
    res.json(filteredWorkshops);
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 