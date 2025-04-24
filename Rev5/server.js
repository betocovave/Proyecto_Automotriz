const express = require('express');
const mysql = require('mysql2');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = 3000;

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Cambiar por tus credenciales
    password: '', // Cambiar por tu contraseña
    database: 'automotriz' // Cambiar por el nombre de tu base de datos
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL');
});

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Configuración de Socket.IO
io.on('connection', (socket) => {
    console.log('Cliente conectado');

    // Función para obtener y enviar datos actualizados
    const sendUpdatedData = () => {
        db.query('SELECT * FROM vehiculos', (err, results) => {
            if (err) {
                console.error('Error al obtener datos:', err);
                return;
            }
            socket.emit('data-update', results);
        });
    };

    // Enviar datos iniciales
    sendUpdatedData();

    // Escuchar cambios en la base de datos
    setInterval(sendUpdatedData, 5000); // Actualizar cada 5 segundos

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Endpoint para obtener datos
app.get('/api/data', (req, res) => {
    db.query('SELECT * FROM vehiculos', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error al obtener datos' });
            return;
        }
        res.json(results);
    });
});

// Iniciar el servidor
http.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
}); 