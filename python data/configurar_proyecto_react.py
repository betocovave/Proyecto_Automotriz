import os
import sys
import subprocess
import json
import shutil
import time

def configurar_proyecto_react():
    """
    Script para configurar automáticamente un proyecto React
    que mejore la visualización de los datos de talleres automotrices.
    """
    print("=" * 60)
    print("CONFIGURACIÓN DE PROYECTO REACT - VISUALIZACIÓN MEJORADA")
    print("=" * 60)
    
    # Obtener la ruta del directorio actual
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    
    # Crear directorio para el proyecto React
    react_dir = os.path.join(parent_dir, 'dashboard-react')
    
    if os.path.exists(react_dir):
        print(f"El directorio {react_dir} ya existe.")
        respuesta = input("¿Deseas eliminarlo y crear uno nuevo? (s/n): ")
        if respuesta.lower() == 's':
            try:
                shutil.rmtree(react_dir)
                print(f"Directorio {react_dir} eliminado correctamente.")
            except Exception as e:
                print(f"Error al eliminar el directorio: {str(e)}")
                return False
        else:
            print("Operación cancelada.")
            return False
    
    # Verificar si Node.js está instalado
    try:
        node_version = subprocess.check_output(['node', '--version'], stderr=subprocess.STDOUT)
        print(f"Node.js instalado: {node_version.decode('utf-8').strip()}")
    except:
        print("Node.js no está instalado o no se encuentra en el PATH.")
        print("Por favor, instala Node.js desde https://nodejs.org/ y vuelve a ejecutar este script.")
        return False
    
    # Verificar si npm está instalado
    try:
        npm_version = subprocess.check_output(['npm', '--version'], stderr=subprocess.STDOUT)
        print(f"npm instalado: {npm_version.decode('utf-8').strip()}")
    except:
        print("npm no está instalado o no se encuentra en el PATH.")
        print("Por favor, instala Node.js (que incluye npm) desde https://nodejs.org/")
        return False
    
    print("\nConfigurando proyecto React...")
    
    # Crear el proyecto React con Create React App
    try:
        print("\n1. Creando proyecto React con Create React App...")
        os.makedirs(react_dir, exist_ok=True)
        os.chdir(react_dir)
        
        # Usar npx para ejecutar create-react-app
        subprocess.check_call(['npx', 'create-react-app', '.'])
        
        print("\n2. Instalando dependencias adicionales...")
        # Instalar paquetes necesarios
        subprocess.check_call(['npm', 'install', 
                               'react-plotly.js', 'plotly.js',
                               'react-bootstrap', 'bootstrap',
                               'react-table', 'react-icons',
                               'axios', 'recharts', 'styled-components'])
        
        print("\n3. Configurando estructura del proyecto...")
        
        # Crear estructura de carpetas
        os.makedirs(os.path.join(react_dir, 'src', 'components'), exist_ok=True)
        os.makedirs(os.path.join(react_dir, 'src', 'pages'), exist_ok=True)
        os.makedirs(os.path.join(react_dir, 'src', 'utils'), exist_ok=True)
        os.makedirs(os.path.join(react_dir, 'src', 'data'), exist_ok=True)
        
        # Copiar datos del CSV
        csv_source = os.path.join(current_dir, 'dataset_talleres_mejorado.csv')
        csv_dest = os.path.join(react_dir, 'src', 'data', 'dataset_talleres.csv')
        shutil.copy2(csv_source, csv_dest)
        
        # Crear archivo para cargar datos
        data_loader_path = os.path.join(react_dir, 'src', 'utils', 'dataLoader.js')
        with open(data_loader_path, 'w') as f:
            f.write("""
import Papa from 'papaparse';
import datasetCsv from '../data/dataset_talleres.csv';

export const loadData = async () => {
  return new Promise((resolve, reject) => {
    Papa.parse(datasetCsv, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
""")
        
        # Instalar papaparse para parsear CSV
        subprocess.check_call(['npm', 'install', 'papaparse'])
        
        # Crear componentes básicos
        dashboard_path = os.path.join(react_dir, 'src', 'components', 'Dashboard.js')
        with open(dashboard_path, 'w') as f:
            f.write("""
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Plot from 'react-plotly.js';
import { loadData } from '../utils/dataLoader';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
`;

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const talleres = await loadData();
        setData(talleres);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los datos');
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Cargando datos...</div>;
  if (error) return <div>Error: {error}</div>;

  // Preparar datos para las gráficas
  const groupByTipoTaller = () => {
    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.Tipo_Taller]) {
        grouped[item.Tipo_Taller] = {
          count: 0,
          reparaciones: 0,
          eficiencia: 0,
          tiempoPromedio: 0
        };
      }
      grouped[item.Tipo_Taller].count += 1;
      grouped[item.Tipo_Taller].reparaciones += item.Reparaciones_Realizadas;
      grouped[item.Tipo_Taller].eficiencia += item.KPI_Eficiencia;
      grouped[item.Tipo_Taller].tiempoPromedio += item.Tiempo_Promedio_Reparacion;
    });
    
    // Calcular promedios
    Object.keys(grouped).forEach(key => {
      grouped[key].reparacionesPromedio = grouped[key].reparaciones / grouped[key].count;
      grouped[key].eficienciaPromedio = grouped[key].eficiencia / grouped[key].count;
      grouped[key].tiempoPromedio = grouped[key].tiempoPromedio / grouped[key].count;
    });
    
    return Object.keys(grouped).map(key => ({
      tipo: key,
      cantidad: grouped[key].count,
      reparacionesPromedio: parseFloat(grouped[key].reparacionesPromedio.toFixed(2)),
      eficienciaPromedio: parseFloat(grouped[key].eficienciaPromedio.toFixed(2)),
      tiempoPromedio: parseFloat(grouped[key].tiempoPromedio.toFixed(2))
    }));
  };

  const tiposTaller = groupByTipoTaller();

  return (
    <Container fluid>
      <h1 className="my-4">Dashboard de Talleres Automotrices</h1>
      
      {/* Resumen */}
      <Row>
        <Col md={12}>
          <StyledCard>
            <Card.Header as="h5">Resumen General</Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <div className="text-center">
                    <h2>{data.length}</h2>
                    <p>Talleres Analizados</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h2>{tiposTaller.length}</h2>
                    <p>Tipos de Talleres</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h2>{data.reduce((sum, item) => sum + item.Reparaciones_Realizadas, 0)}</h2>
                    <p>Total Reparaciones</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h2>{parseFloat((data.reduce((sum, item) => sum + item.KPI_Eficiencia, 0) / data.length).toFixed(2))}</h2>
                    <p>Eficiencia Promedio</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </StyledCard>
        </Col>
      </Row>
      
      {/* Gráfico de barras */}
      <Row>
        <Col md={6}>
          <StyledCard>
            <Card.Header as="h5">Reparaciones por Tipo de Taller</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tiposTaller}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reparacionesPromedio" fill="#8884d8" name="Reparaciones Promedio" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </StyledCard>
        </Col>
        
        <Col md={6}>
          <StyledCard>
            <Card.Header as="h5">Eficiencia por Tipo de Taller</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tiposTaller}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="eficienciaPromedio" fill="#82ca9d" name="Eficiencia Promedio" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </StyledCard>
        </Col>
      </Row>
      
      {/* Gráfico 3D */}
      <Row>
        <Col md={12}>
          <StyledCard>
            <Card.Header as="h5">Visualización 3D: Eficiencia, Capacitación y Reparaciones</Card.Header>
            <Card.Body>
              <Plot
                data={[
                  {
                    x: data.map(item => item.KPI_Eficiencia),
                    y: data.map(item => item.Capacitacion_Tecnicos),
                    z: data.map(item => item.Reparaciones_Realizadas),
                    mode: 'markers',
                    marker: {
                      size: 8,
                      color: data.map(item => {
                        switch(item.Tipo_Taller) {
                          case 'Premium VW': return 'red';
                          case 'Concesionario': return 'blue';
                          case 'Concesionario VW': return 'green';
                          case 'Independiente': return 'orange';
                          default: return 'gray';
                        }
                      }),
                      opacity: 0.8
                    },
                    type: 'scatter3d',
                    text: data.map(item => `${item.Tipo_Taller}<br>Eficiencia: ${item.KPI_Eficiencia}<br>Reparaciones: ${item.Reparaciones_Realizadas}`),
                    hoverinfo: 'text'
                  }
                ]}
                layout={{
                  autosize: true,
                  height: 600,
                  scene: {
                    xaxis: { title: 'Eficiencia' },
                    yaxis: { title: 'Capacitación Técnicos' },
                    zaxis: { title: 'Reparaciones' }
                  },
                  margin: { l: 0, r: 0, b: 0, t: 0 }
                }}
                config={{ responsive: true }}
              />
            </Card.Body>
          </StyledCard>
        </Col>
      </Row>
      
      {/* Tabla con los datos */}
      <Row>
        <Col md={12}>
          <StyledCard>
            <Card.Header as="h5">Datos Completos</Card.Header>
            <Card.Body style={{ overflowX: 'auto' }}>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Tipo de Taller</th>
                    <th>Reparaciones</th>
                    <th>Eficiencia</th>
                    <th>Tiempo Reparación</th>
                    <th>Mecánicos</th>
                    <th>Capacitación</th>
                    <th>Piezas Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((taller, index) => (
                    <tr key={index}>
                      <td>{taller.Tipo_Taller}</td>
                      <td>{taller.Reparaciones_Realizadas}</td>
                      <td>{taller.KPI_Eficiencia?.toFixed(2)}</td>
                      <td>{taller.Tiempo_Promedio_Reparacion?.toFixed(2)}</td>
                      <td>{taller.Mecanicos_Disponibles}</td>
                      <td>{taller.Capacitacion_Tecnicos}</td>
                      <td>{taller.Piezas_Disponibles_Ratio?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </StyledCard>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
""")
        
        # Modificar App.js para usar Bootstrap y el dashboard
        app_js_path = os.path.join(react_dir, 'src', 'App.js')
        with open(app_js_path, 'w') as f:
            f.write("""
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Navbar, Nav } from 'react-bootstrap';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <div className="App">
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#home">Dashboard Talleres Automotrices</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="#dashboard">Dashboard</Nav.Link>
              <Nav.Link href="#datos">Datos</Nav.Link>
              <Nav.Link href="#analisis">Análisis</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <Dashboard />
    </div>
  );
}

export default App;
""")
        
        # Modificar index.css para estilos globales
        index_css_path = os.path.join(react_dir, 'src', 'index.css')
        with open(index_css_path, 'w') as f:
            f.write("""
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.card-header {
  background-color: #343a40;
  color: white;
}

.table th {
  background-color: #f8f9fa;
}
""")
        
        # Crear un script de shell para ejecutar el proyecto
        bat_path = os.path.join(react_dir, 'ejecutar_dashboard.bat')
        with open(bat_path, 'w') as f:
            f.write("""@echo off
echo Iniciando Dashboard de Talleres Automotrices...
cd %~dp0
npm start
""")
        
        # Crear README con instrucciones
        readme_path = os.path.join(react_dir, 'README.md')
        with open(readme_path, 'w') as f:
            f.write("""# Dashboard Interactivo de Talleres Automotrices

Este proyecto es un dashboard interactivo para visualizar y analizar datos de talleres automotrices.

## Instalación

Ya se han instalado todas las dependencias necesarias. Para ejecutar el proyecto:

1. Abre una terminal en este directorio
2. Ejecuta `npm start`
3. O simplemente haz doble clic en el archivo `ejecutar_dashboard.bat`

El dashboard se abrirá automáticamente en tu navegador.

## Características

- Visualización completa de los 65 registros de talleres
- Gráficos interactivos con Plotly.js y Recharts
- Análisis por tipo de taller
- Visualización 3D de las relaciones entre variables clave
- Tabla completa de datos
- Diseño responsivo con Bootstrap
""")
        
        print("\n4. Construcción del proyecto finalizada!")
        print(f"\nEl proyecto React ha sido configurado en: {react_dir}")
        print("\nPara ejecutar el dashboard, puedes:")
        print(f"1. Hacer doble clic en: {os.path.join(react_dir, 'ejecutar_dashboard.bat')}")
        print(f"2. Abrir una terminal en {react_dir} y ejecutar: npm start")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\nError durante la configuración del proyecto React: {str(e)}")
        return False
    except Exception as e:
        print(f"\nError inesperado: {str(e)}")
        return False

if __name__ == "__main__":
    configurar_proyecto_react() 