import base64
import os
import glob

def imagen_a_base64(ruta_imagen):
    """Convierte una imagen a base64 para incrustarla en HTML"""
    if not os.path.exists(ruta_imagen):
        return None
    
    with open(ruta_imagen, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

def generar_html_avanzado():
    """Genera un archivo HTML con todos los resultados y gráficos del análisis avanzado"""
    # Obtener la ruta actual
    current_dir = os.path.dirname(os.path.abspath(__file__))
    graficos_dir = os.path.join(current_dir, 'graficos')
    
    # Verificar si la carpeta de gráficos existe
    if not os.path.exists(graficos_dir):
        print("Error: No se encontró la carpeta de gráficos.")
        print("Ejecute primero regresion_talleres_avanzado.py para generar los gráficos.")
        return
    
    # Obtener todos los gráficos en la carpeta
    graficos = glob.glob(os.path.join(graficos_dir, '*.png'))
    
    if not graficos:
        print("Error: No se encontraron gráficos en la carpeta 'graficos'.")
        print("Ejecute primero regresion_talleres_avanzado.py para generar los gráficos.")
        return
    
    print(f"Procesando {len(graficos)} gráficos...")
    
    # Convertir todas las imágenes a base64
    imagenes_base64 = {}
    for grafico in graficos:
        nombre = os.path.basename(grafico)
        print(f"Procesando: {nombre}")
        imagenes_base64[nombre] = imagen_a_base64(grafico)
    
    # Crear contenido HTML
    html_template = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análisis Avanzado de Productividad en Talleres Automotrices</title>
    <style>
        :root {
            --primary-color: #2c3e50;
            --secondary-color: #3498db;
            --accent-color: #e74c3c;
            --text-color: #333;
            --bg-color: #f9f9f9;
            --card-bg: #ffffff;
        }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            color: var(--text-color);
            background-color: var(--bg-color);
        }
        header {
            background-color: var(--primary-color);
            color: white;
            text-align: center;
            padding: 2rem 0;
            margin-bottom: 2rem;
        }
        h1 {
            margin: 0;
            font-size: 2.5rem;
        }
        .subtitle {
            font-style: italic;
            opacity: 0.9;
            margin-top: 0.5rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        .section {
            margin-bottom: 3rem;
        }
        .section-title {
            color: var(--primary-color);
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 0.5rem;
            margin-bottom: 1.5rem;
        }
        .card {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        .card-title {
            color: var(--secondary-color);
            margin-top: 0;
            margin-bottom: 1rem;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
        }
        @media (min-width: 768px) {
            .grid-2 {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        .image-container {
            margin: 1.5rem 0;
            text-align: center;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .caption {
            margin-top: 0.5rem;
            font-style: italic;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: var(--primary-color);
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .highlight {
            color: var(--accent-color);
            font-weight: bold;
        }
        .conclusion-list {
            list-style-type: none;
            padding-left: 0;
        }
        .conclusion-list li {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
            position: relative;
        }
        .conclusion-list li:before {
            content: "→";
            color: var(--secondary-color);
            position: absolute;
            left: 0;
        }
        footer {
            background-color: var(--primary-color);
            color: white;
            text-align: center;
            padding: 1rem 0;
            margin-top: 3rem;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>Análisis Avanzado de Productividad en Talleres Automotrices</h1>
            <p class="subtitle">Con enfoque especial en talleres Volkswagen</p>
        </div>
    </header>

    <div class="container">
        <section class="section">
            <h2 class="section-title">Resumen del Análisis</h2>
            <div class="card">
                <p>Este informe presenta un análisis avanzado de la productividad en talleres automotrices, con especial énfasis en los talleres de Volkswagen. El análisis utiliza técnicas de aprendizaje automático y estadística para identificar factores clave que influyen en la productividad de los talleres.</p>
                <p>Se compararon diferentes tipos de talleres (Premium VW, Concesionario VW, Concesionario e Independiente) y se analizaron múltiples variables que afectan el número de reparaciones realizadas.</p>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Exploración de Datos</h2>
            
            <div class="card">
                <h3 class="card-title">Distribución de Reparaciones por Tipo de Taller</h3>
                <p>La siguiente gráfica muestra cómo se distribuyen las reparaciones realizadas según el tipo de taller.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{reparaciones_por_tipo_taller}" alt="Distribución de Reparaciones por Tipo de Taller">
                    <p class="caption">Los talleres Concesionario VW y Premium VW tienden a completar más reparaciones.</p>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Eficiencia vs. Reparaciones</h3>
                <p>Esta gráfica muestra la relación entre el KPI de eficiencia y el número de reparaciones realizadas.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{eficiencia_vs_reparaciones}" alt="Eficiencia vs. Reparaciones">
                    <p class="caption">Se observa una clara correlación positiva entre eficiencia y número de reparaciones.</p>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Matriz de Correlación</h3>
                <p>La matriz de correlación muestra cómo se relacionan las diferentes variables entre sí.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{matriz_correlacion}" alt="Matriz de Correlación">
                    <p class="caption">Las variables con mayor correlación con las reparaciones son: KPI de Eficiencia, Capacitación de Técnicos y Citas Diarias.</p>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Relaciones Principales</h3>
                <p>Estas gráficas muestran las relaciones entre las variables principales y las reparaciones realizadas.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{relaciones_principales}" alt="Relaciones Principales">
                    <p class="caption">Se destacan las relaciones entre mecánicos disponibles, tiempo de reparación, capacitación y disponibilidad de piezas con el número de reparaciones.</p>
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Modelado y Predicción</h2>
            
            <div class="card">
                <h3 class="card-title">Comparación de Modelos</h3>
                <p>Se compararon diferentes modelos de machine learning para predecir el número de reparaciones realizadas.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{comparacion_modelos}" alt="Comparación de Modelos">
                    <p class="caption">Comparación del rendimiento (R² y RMSE) de los diferentes modelos implementados.</p>
                </div>
                
                <table>
                    <tr>
                        <th>Modelo</th>
                        <th>R²</th>
                        <th>RMSE</th>
                        <th>MAE</th>
                    </tr>
                    <tr>
                        <td>Regresión Lineal</td>
                        <td class="highlight">0.74</td>
                        <td>5.05</td>
                        <td>4.23</td>
                    </tr>
                    <tr>
                        <td>Ridge</td>
                        <td>0.73</td>
                        <td>5.16</td>
                        <td>4.11</td>
                    </tr>
                    <tr>
                        <td>Lasso</td>
                        <td>0.70</td>
                        <td>5.43</td>
                        <td>4.33</td>
                    </tr>
                    <tr>
                        <td>Random Forest</td>
                        <td>0.64</td>
                        <td>6.02</td>
                        <td>5.13</td>
                    </tr>
                </table>
            </div>

            <div class="card">
                <h3 class="card-title">Resultados del Mejor Modelo</h3>
                <p>El modelo de Regresión Lineal obtuvo el mejor rendimiento con un R² de 0.74, lo que significa que explica el 74% de la variabilidad en las reparaciones realizadas.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{mejor_modelo_predicciones}" alt="Predicciones del Mejor Modelo">
                    <p class="caption">Valores reales vs. predicciones del modelo de Regresión Lineal.</p>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Variables Más Influyentes</h3>
                <p>Las variables que más influyen en la predicción del número de reparaciones son:</p>
                <ul>
                    <li>KPI de Eficiencia</li>
                    <li>Citas Diarias</li>
                    <li>Capacitación de Técnicos</li>
                    <li>Disponibilidad de Piezas</li>
                    <li>Mecánicos Disponibles</li>
                </ul>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Análisis Específico para Talleres Volkswagen</h2>
            
            <div class="card">
                <h3 class="card-title">Eficiencia por Tipo de Taller Volkswagen</h3>
                <p>Comparación de la eficiencia entre los diferentes tipos de talleres relacionados con Volkswagen.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{eficiencia_talleres_vw}" alt="Eficiencia de Talleres Volkswagen">
                    <p class="caption">Los talleres Premium VW y Concesionario VW muestran niveles más altos de eficiencia.</p>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Comparación con Talleres Independientes</h3>
                <p>Esta gráfica compara la capacitación de técnicos y las reparaciones realizadas entre talleres Volkswagen e independientes.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{comparacion_vw_vs_independientes}" alt="Comparación VW vs Independientes">
                    <p class="caption">Los talleres Volkswagen muestran niveles más altos de capacitación y mayor número de reparaciones.</p>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Antigüedad de Vehículos vs. Tiempo de Reparación</h3>
                <p>Relación entre la antigüedad promedio de los vehículos y el tiempo que toma repararlos.</p>
                <div class="image-container">
                    <img src="data:image/png;base64,{antiguedad_vs_tiempo_reparacion}" alt="Antigüedad vs Tiempo de Reparación">
                    <p class="caption">Los vehículos más antiguos tienden a requerir más tiempo para ser reparados.</p>
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Conclusiones</h2>
            
            <div class="card">
                <h3 class="card-title">Hallazgos Principales</h3>
                <ul class="conclusion-list">
                    <li>Los talleres Premium VW muestran la mayor eficiencia (0.83) seguidos por los Concesionarios VW (0.82).</li>
                    <li>Los talleres Concesionario VW realizan el mayor número de reparaciones (32.4 en promedio), seguidos por los Premium VW (28.8).</li>
                    <li>La capacitación de los técnicos es significativamente mayor en los talleres Volkswagen (95% en promedio) que en los independientes (53%).</li>
                    <li>La disponibilidad de piezas es un factor crítico para la productividad, siendo mucho mayor en talleres VW (93%) que en independientes (68%).</li>
                    <li>Los vehículos más antiguos (>7 años) requieren en promedio un 68% más de tiempo para ser reparados que los más recientes.</li>
                    <li>El modelo de regresión lineal puede predecir con buena precisión (R² = 0.74) el número de reparaciones que puede realizar un taller.</li>
                </ul>
            </div>

            <div class="card">
                <h3 class="card-title">Recomendaciones</h3>
                <ul class="conclusion-list">
                    <li>Invertir en la capacitación continua de los técnicos para mejorar la eficiencia y reducir los tiempos de reparación.</li>
                    <li>Optimizar la disponibilidad de piezas, especialmente para los modelos más antiguos.</li>
                    <li>Implementar las prácticas de los talleres Premium VW en otros tipos de talleres para mejorar su eficiencia.</li>
                    <li>Utilizar el modelo predictivo desarrollado para estimar la capacidad de reparaciones y optimizar la asignación de recursos.</li>
                    <li>Considerar la especialización por antigüedad de vehículos para mejorar la eficiencia en las reparaciones.</li>
                </ul>
            </div>
        </section>
    </div>

    <footer>
        <div class="container">
            <p>© 2025 Análisis de Productividad en Talleres Automotrices</p>
        </div>
    </footer>
</body>
</html>
"""
    
    # Reemplazar los marcadores de posición por las imágenes en base64
    html_content = html_template
    for nombre, imagen_base64 in imagenes_base64.items():
        # Quitar la extensión .png del nombre para usar como marcador de posición
        marcador = nombre.replace('.png', '')
        html_content = html_content.replace(f'{{{marcador}}}', imagen_base64)
    
    # Escribir el archivo HTML
    reporte_path = os.path.join(current_dir, "reporte_avanzado_talleres.html")
    with open(reporte_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print(f"\nReporte HTML avanzado generado correctamente: {reporte_path}")
    print("Abra este archivo en su navegador para ver el análisis completo y los gráficos.")

if __name__ == "__main__":
    generar_html_avanzado() 