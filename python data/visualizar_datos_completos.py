import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.io as pio
pio.renderers.default = "browser"

# Obtener la ruta actual
current_dir = os.path.dirname(os.path.abspath(__file__))

# Cargar el dataset mejorado
file_path = os.path.join(current_dir, 'dataset_talleres_mejorado.csv')
df = pd.read_csv(file_path)

# Crear directorio para gráficos interactivos si no existe
interactive_dir = os.path.join(current_dir, 'graficos_interactivos')
if not os.path.exists(interactive_dir):
    os.makedirs(interactive_dir)

print(f"Dataset cargado con {len(df)} registros y {len(df.columns)} variables")
print("Tipos de talleres:")
print(df['Tipo_Taller'].value_counts())

# 1. Gráfico de dispersión interactivo: Eficiencia vs Reparaciones con color por tipo de taller
fig1 = px.scatter(df, x="KPI_Eficiencia", y="Reparaciones_Realizadas", 
                 color="Tipo_Taller", size="Mecanicos_Disponibles",
                 hover_name="Tipo_Taller", 
                 hover_data=["Capacitacion_Tecnicos", "Piezas_Disponibles_Ratio", "Antigüedad_Promedio_Vehiculos"],
                 title="Eficiencia vs Reparaciones por Tipo de Taller",
                 labels={"KPI_Eficiencia": "Índice de Eficiencia", 
                         "Reparaciones_Realizadas": "Reparaciones Realizadas",
                         "Tipo_Taller": "Tipo de Taller",
                         "Mecanicos_Disponibles": "Mecánicos Disponibles"}
                )
fig1.update_layout(
    width=1000, 
    height=700,
    legend=dict(title="Tipo de Taller"),
    hovermode="closest"
)

# Guardar como HTML interactivo
html_path1 = os.path.join(interactive_dir, "eficiencia_vs_reparaciones_interactivo.html")
fig1.write_html(html_path1)

# 2. Gráfico de burbujas: Capacitación vs Tiempo de Reparación vs Reparaciones
fig2 = px.scatter(df, x="Capacitacion_Tecnicos", y="Tiempo_Promedio_Reparacion", 
                 size="Reparaciones_Realizadas", color="Tipo_Taller",
                 hover_name="Tipo_Taller", 
                 hover_data=["KPI_Eficiencia", "Piezas_Disponibles_Ratio", "Antigüedad_Promedio_Vehiculos"],
                 title="Relación entre Capacitación de Técnicos, Tiempo de Reparación y Productividad",
                 labels={"Capacitacion_Tecnicos": "Nivel de Capacitación de Técnicos", 
                         "Tiempo_Promedio_Reparacion": "Tiempo Promedio de Reparación (horas)",
                         "Reparaciones_Realizadas": "Reparaciones Realizadas",
                         "Tipo_Taller": "Tipo de Taller"}
                )
fig2.update_layout(
    width=1000, 
    height=700,
    legend=dict(title="Tipo de Taller"),
    hovermode="closest"
)

# Guardar como HTML interactivo
html_path2 = os.path.join(interactive_dir, "capacitacion_vs_tiempo_reparacion_interactivo.html")
fig2.write_html(html_path2)

# 3. Gráfico 3D: Eficiencia, Capacitación y Reparaciones
fig3 = px.scatter_3d(df, x="KPI_Eficiencia", y="Capacitacion_Tecnicos", z="Reparaciones_Realizadas",
                    color="Tipo_Taller", size="Piezas_Disponibles_Ratio",
                    hover_name="Tipo_Taller", 
                    hover_data=["Mecanicos_Disponibles", "Antigüedad_Promedio_Vehiculos", "Ingresos_Promedio"],
                    title="Relación 3D entre Eficiencia, Capacitación y Reparaciones",
                    labels={"KPI_Eficiencia": "Índice de Eficiencia",
                            "Capacitacion_Tecnicos": "Nivel de Capacitación de Técnicos", 
                            "Reparaciones_Realizadas": "Reparaciones Realizadas",
                            "Tipo_Taller": "Tipo de Taller",
                            "Piezas_Disponibles_Ratio": "Disponibilidad de Piezas"}
                   )
fig3.update_layout(
    width=1000, 
    height=800,
    scene=dict(
        xaxis_title="Eficiencia",
        yaxis_title="Capacitación Técnicos",
        zaxis_title="Reparaciones Realizadas"
    ),
    margin=dict(r=20, l=10, b=10, t=40)
)

# Guardar como HTML interactivo
html_path3 = os.path.join(interactive_dir, "relacion_3d_interactivo.html")
fig3.write_html(html_path3)

# 4. Dashboard con todos los talleres y sus métricas principales
fig4 = make_subplots(
    rows=2, cols=2,
    specs=[[{"type": "table"}, {"type": "scatter"}],
           [{"type": "bar"}, {"type": "bar"}]],
    subplot_titles=("Datos de todos los talleres", "Eficiencia vs Reparaciones", 
                   "Reparaciones por Tipo de Taller", "Tiempo Promedio de Reparación por Tipo de Taller")
)

# Tabla de datos
df_table = df[['Tipo_Taller', 'KPI_Eficiencia', 'Reparaciones_Realizadas', 
               'Capacitacion_Tecnicos', 'Tiempo_Promedio_Reparacion']].round(2)

fig4.add_trace(
    go.Table(
        header=dict(
            values=list(df_table.columns),
            fill_color='royalblue',
            align=['left', 'center'],
            font=dict(color='white', size=12)
        ),
        cells=dict(
            values=[df_table[k].tolist() for k in df_table.columns],
            fill_color='lavender',
            align=['left', 'center']
        )
    ),
    row=1, col=1
)

# Gráfico de dispersión
fig4.add_trace(
    go.Scatter(
        x=df['KPI_Eficiencia'],
        y=df['Reparaciones_Realizadas'],
        mode='markers',
        marker=dict(
            size=10,
            color=df['Capacitacion_Tecnicos'],
            colorscale='Viridis',
            showscale=True,
            colorbar=dict(title="Capacitación")
        ),
        text=df['Tipo_Taller'],
        hovertemplate='<b>%{text}</b><br>Eficiencia: %{x:.2f}<br>Reparaciones: %{y}<extra></extra>'
    ),
    row=1, col=2
)

# Reparaciones por tipo de taller (promedio)
avg_rep_by_type = df.groupby('Tipo_Taller')['Reparaciones_Realizadas'].mean().reset_index()
fig4.add_trace(
    go.Bar(
        x=avg_rep_by_type['Tipo_Taller'],
        y=avg_rep_by_type['Reparaciones_Realizadas'],
        marker_color='royalblue',
        hovertemplate='<b>%{x}</b><br>Reparaciones promedio: %{y:.1f}<extra></extra>'
    ),
    row=2, col=1
)

# Tiempo de reparación por tipo de taller (promedio)
avg_time_by_type = df.groupby('Tipo_Taller')['Tiempo_Promedio_Reparacion'].mean().reset_index()
fig4.add_trace(
    go.Bar(
        x=avg_time_by_type['Tipo_Taller'],
        y=avg_time_by_type['Tiempo_Promedio_Reparacion'],
        marker_color='orangered',
        hovertemplate='<b>%{x}</b><br>Tiempo promedio: %{y:.1f} horas<extra></extra>'
    ),
    row=2, col=2
)

fig4.update_layout(
    title_text="Dashboard de Análisis de Talleres Automotrices",
    height=900,
    width=1200,
    showlegend=False
)

# Guardar como HTML interactivo
html_path4 = os.path.join(interactive_dir, "dashboard_talleres_completo.html")
fig4.write_html(html_path4)

# 5. Tabla completa interactiva con todos los datos
fig5 = go.Figure(data=[go.Table(
    header=dict(
        values=list(df.columns),
        fill_color='royalblue',
        align='center',
        font=dict(color='white', size=12)
    ),
    cells=dict(
        values=[df[k].tolist() for k in df.columns],
        fill_color='lavender',
        align=['left'] + ['center'] * (len(df.columns) - 1),
        font=dict(size=11)
    )
)])

fig5.update_layout(
    title_text="Tabla Completa de Datos de Talleres Automotrices",
    height=600,
    width=1200
)

# Guardar como HTML interactivo
html_path5 = os.path.join(interactive_dir, "tabla_completa_datos.html")
fig5.write_html(html_path5)

# Crear un índice HTML para facilitar la navegación entre gráficos
index_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualizaciones Interactivas - Talleres Automotrices</title>
    <style>
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            background-color: #f5f7fa;
        }}
        h1, h2 {{
            color: #2c3e50;
        }}
        .container {{
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin-top: 20px;
        }}
        .vis-list {{
            list-style-type: none;
            padding: 0;
        }}
        .vis-item {{
            margin-bottom: 20px;
            padding: 15px;
            background: #f0f4f8;
            border-radius: 5px;
            border-left: 5px solid #3498db;
            transition: transform 0.2s;
        }}
        .vis-item:hover {{
            transform: translateX(5px);
            background: #e8f0fe;
        }}
        .vis-link {{
            display: block;
            color: #2980b9;
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1em;
        }}
        .vis-link:hover {{
            color: #3498db;
            text-decoration: underline;
        }}
        .vis-desc {{
            margin-top: 8px;
            color: #555;
        }}
        .info {{
            margin-top: 30px;
            padding: 15px;
            border-radius: 5px;
            background: #e8f4f8;
            border-left: 5px solid #2cc;
        }}
    </style>
</head>
<body>
    <h1>Visualizaciones Interactivas - Talleres Automotrices</h1>
    <div class="container">
        <p>En esta página puedes acceder a todas las visualizaciones interactivas generadas para el análisis de talleres automotrices. Cada visualización te permite explorar los datos de diferentes maneras, incluyendo filtros, hover para más información y zoom.</p>
        
        <h2>Visualizaciones Disponibles</h2>
        <ul class="vis-list">
            <li class="vis-item">
                <a href="eficiencia_vs_reparaciones_interactivo.html" class="vis-link">Eficiencia vs Reparaciones por Tipo de Taller</a>
                <p class="vis-desc">Visualiza la relación entre la eficiencia y el número de reparaciones realizadas. El tamaño de los puntos representa el número de mecánicos disponibles.</p>
            </li>
            <li class="vis-item">
                <a href="capacitacion_vs_tiempo_reparacion_interactivo.html" class="vis-link">Capacitación vs Tiempo de Reparación vs Productividad</a>
                <p class="vis-desc">Explora cómo el nivel de capacitación de los técnicos influye en el tiempo de reparación. El tamaño de los puntos representa el número de reparaciones realizadas.</p>
            </li>
            <li class="vis-item">
                <a href="relacion_3d_interactivo.html" class="vis-link">Visualización 3D de Eficiencia, Capacitación y Reparaciones</a>
                <p class="vis-desc">Gráfico tridimensional que muestra la relación entre eficiencia, capacitación de técnicos y reparaciones realizadas. Puedes rotar, hacer zoom y filtrar por tipo de taller.</p>
            </li>
            <li class="vis-item">
                <a href="dashboard_talleres_completo.html" class="vis-link">Dashboard Completo de Talleres</a>
                <p class="vis-desc">Panel interactivo que incluye una tabla de datos y múltiples gráficos comparativos entre los diferentes tipos de talleres.</p>
            </li>
            <li class="vis-item">
                <a href="tabla_completa_datos.html" class="vis-link">Tabla Completa de Datos</a>
                <p class="vis-desc">Visualiza todos los datos del dataset en formato de tabla interactiva. Puedes ordenar, filtrar y explorar todos los 65 registros con sus 11 variables.</p>
            </li>
        </ul>
        
        <div class="info">
            <p><strong>Nota:</strong> Estas visualizaciones son interactivas. Puedes hacer clic, arrastrar, hacer zoom, filtrar y pasar el cursor sobre los elementos para ver información adicional.</p>
        </div>
    </div>
</body>
</html>
"""

# Guardar el archivo de índice
index_path = os.path.join(interactive_dir, "index.html")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(index_html)

print("\nVisualizaciones interactivas generadas correctamente:")
print(f"1. Eficiencia vs Reparaciones: {html_path1}")
print(f"2. Capacitación vs Tiempo de Reparación: {html_path2}")
print(f"3. Visualización 3D: {html_path3}")
print(f"4. Dashboard completo: {html_path4}")
print(f"5. Tabla completa de datos: {html_path5}")
print(f"\nPágina de índice: {index_path}")
print("\nAbre el archivo index.html en tu navegador para ver todas las visualizaciones.") 