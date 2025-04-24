import base64
import os

def imagen_a_base64(ruta_imagen):
    """Convierte una imagen a base64 para incrustarla en HTML"""
    if not os.path.exists(ruta_imagen):
        return None
    
    with open(ruta_imagen, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

def generar_html():
    """Genera un archivo HTML con los resultados y gráficos del análisis"""
    # Obtener la ruta actual
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Obtener imágenes en base64
    imagen1 = imagen_a_base64(os.path.join(current_dir, 'regresion_talleres_resultados.png'))
    imagen2 = imagen_a_base64(os.path.join(current_dir, 'importancia_variables.png'))
    
    # Verificar si las imágenes existen
    if not imagen1 or not imagen2:
        print("Error: No se encontraron todos los archivos de gráficos.")
        print("Ejecute primero regresion_talleres.py para generar los gráficos.")
        return
    
    # Crear contenido HTML
    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados de Regresión Lineal - Talleres Automotrices</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
        }}
        h1, h2 {{
            color: #2c3e50;
        }}
        .container {{
            display: flex;
            flex-direction: column;
            gap: 30px;
        }}
        .section {{
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }}
        .image-container {{
            text-align: center;
            margin: 20px 0;
        }}
        img {{
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #2c3e50;
            color: white;
        }}
        tr:hover {{
            background-color: #f5f5f5;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="section">
            <h1>Resultados de Regresión Lineal - Talleres Automotrices</h1>
            <p>Este informe presenta los resultados de un análisis de regresión lineal aplicado a datos de talleres automotrices.</p>
        </div>
        
        <div class="section">
            <h2>Resultados del Modelo</h2>
            <p>El modelo de regresión lineal fue entrenado para predecir el número de reparaciones realizadas basado en diversas características de los talleres.</p>
            
            <table>
                <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>Error Cuadrático Medio (MSE)</td>
                    <td>46.38</td>
                </tr>
                <tr>
                    <td>Coeficiente de Determinación (R²)</td>
                    <td>0.63</td>
                </tr>
            </table>
            
            <h3>Coeficientes del Modelo</h3>
            <table>
                <tr>
                    <th>Variable</th>
                    <th>Coeficiente</th>
                </tr>
                <tr>
                    <td>Citas_Diarias</td>
                    <td>0.67</td>
                </tr>
                <tr>
                    <td>Mecanicos_Disponibles</td>
                    <td>0.79</td>
                </tr>
                <tr>
                    <td>Tiempo_Promedio_Reparacion</td>
                    <td>-0.34</td>
                </tr>
                <tr>
                    <td>Satisfaccion_Cliente</td>
                    <td>0.75</td>
                </tr>
                <tr>
                    <td>Tipo_Taller_Independiente</td>
                    <td>1.96</td>
                </tr>
                <tr>
                    <td>Tipo_Taller_Premium VW</td>
                    <td>0.17</td>
                </tr>
            </table>
        </div>
        
        <div class="section">
            <h2>Visualización: Valores Reales vs. Predicciones</h2>
            <p>Este gráfico muestra la relación entre los valores reales y las predicciones del modelo. Los puntos que caen cerca de la línea diagonal roja indican predicciones precisas.</p>
            <div class="image-container">
                <img src="data:image/png;base64,{imagen1}" alt="Valores Reales vs. Predicciones">
            </div>
        </div>
        
        <div class="section">
            <h2>Visualización: Importancia de las Variables</h2>
            <p>Este gráfico muestra la importancia relativa de cada variable en el modelo. Las barras más altas indican variables con mayor impacto en la predicción.</p>
            <div class="image-container">
                <img src="data:image/png;base64,{imagen2}" alt="Importancia de las Variables">
            </div>
        </div>
        
        <div class="section">
            <h2>Interpretación</h2>
            <p>Basado en los coeficientes del modelo y el valor R² de 0.63, podemos concluir:</p>
            <ul>
                <li>El modelo explica aproximadamente el 63% de la variabilidad en las reparaciones realizadas.</li>
                <li>El número de mecánicos disponibles, la satisfacción del cliente y si el taller es independiente son los factores con mayor impacto positivo.</li>
                <li>Un mayor tiempo promedio de reparación tiene un efecto negativo en el número de reparaciones realizadas.</li>
                <li>Los talleres independientes tienden a realizar más reparaciones que los concesionarios cuando se controlan otras variables.</li>
            </ul>
        </div>
    </div>
</body>
</html>
"""
    
    # Escribir el archivo HTML
    with open(os.path.join(current_dir, "reporte_regresion_talleres.html"), "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print("Reporte HTML generado correctamente: reporte_regresion_talleres.html")
    print("Abra este archivo en su navegador para ver los gráficos y resultados.")

if __name__ == "__main__":
    generar_html() 